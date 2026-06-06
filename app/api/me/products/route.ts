import { successResponse, errorResponse, paginatedResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { CreateProductSchema } from "@/lib/validations/product";
import { getPaginationParams } from "@/utils/pagination";
import { generateSlug, generateWhatsAppLink } from "@/utils/slug";
import { formDataToObject, isMultipartRequest, saveImageFile } from "@/lib/uploads";
import { attachProductMetrics } from "@/lib/productMetrics";

export const dynamic = "force-dynamic";

const CreateAuthenticatedProductSchema = CreateProductSchema.extend({
  storeId: z.string().cuid("Invalid store ID"),
});

async function parseProductRequest(req: NextRequest) {
  if (!isMultipartRequest(req)) {
    return req.json();
  }

  const formData = await req.formData();
  const body = formDataToObject(formData, {
    arrays: ["images"],
    booleans: ["inStock", "isNegotiable"],
    numbers: ["price"],
  });
  const imageFiles = [...formData.getAll("images"), ...formData.getAll("image")].filter(
    (value): value is File => value instanceof File && value.size > 0
  );
  const uploadedImages = await Promise.all(imageFiles.map((file) => saveImageFile(file, "products")));

  if (uploadedImages.length > 0) {
    body.images = [...(Array.isArray(body.images) ? body.images : []), ...uploadedImages];
  }

  return body;
}

async function generateUniqueProductSlug(storeId: string, name: string) {
  const baseSlug = generateSlug(name) || "product";
  let slug = baseSlug;
  let suffix = 1;

  while (await prisma.product.findUnique({ where: { storeId_slug: { storeId, slug } } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return slug;
}

// GET /api/me/products - authenticated user
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const categoryId = searchParams.get("categoryId");
    const storeId = searchParams.get("storeId");
    const search = searchParams.get("search");
    const inStock = searchParams.get("inStock");
    const isActive = searchParams.get("isActive");
    const sort = searchParams.get("sort") ?? "newest";

    const where: Prisma.ProductWhereInput = {
      store: { userId: user.userId },
      ...(categoryId ? { categoryId } : {}),
      ...(storeId ? { storeId } : {}),
      ...(inStock !== null ? { inStock: inStock === "true" } : {}),
      ...(isActive !== null ? { isActive: isActive === "true" } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          location: true,
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              phone: true,
              isVerified: true,
            },
          },
        },
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    const productsWithMetrics = await attachProductMetrics(prisma, products);
    return paginatedResponse(productsWithMetrics, total, page, limit);
  } catch (err) {
    console.error("[ME/PRODUCTS/GET]", err);
    if ((err as Error).message?.includes("authorization")) return errorResponse((err as Error).message, 401);
    return serverErrorResponse(err);
  }
}

// POST /api/me/products - authenticated user
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    const body = await parseProductRequest(req);
    const parsed = CreateAuthenticatedProductSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 422, parsed.error.flatten());

    const { name, categoryId, locationId, storeId, ...rest } = parsed.data;

    const [store, category, location] = await Promise.all([
      prisma.store.findFirst({ where: { id: storeId, userId: user.userId } }),
      prisma.productCategory.findUnique({ where: { id: categoryId } }),
      locationId ? prisma.location.findUnique({ where: { id: locationId } }) : Promise.resolve(null),
    ]);

    if (!store) return errorResponse("Store not found for authenticated user", 404);
    if (!category) return errorResponse("Product category not found", 404);
    if (locationId && !location) return errorResponse("Location not found", 404);

    const resolvedLocationId = locationId || store.locationId || undefined;
    const slug = await generateUniqueProductSlug(store.id, name);
    const product = await prisma.product.create({
      data: { name, slug, storeId: store.id, categoryId, locationId: resolvedLocationId, ...rest },
      include: {
        category: true,
        location: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            isVerified: true,
          },
        },
      },
    });

    const result = store.phone
      ? {
          ...product,
          viewCount: 0,
          whatsappClickCount: 0,
          whatsappOrderLink: generateWhatsAppLink(
            store.phone,
            product.name,
            product.price ? product.price.toString() : "0"
          ),
        }
      : { ...product, viewCount: 0, whatsappClickCount: 0 };

    return successResponse(result, 201);
  } catch (err) {
    console.error("[ME/PRODUCTS/POST]", err);
    if ((err as Error).message?.includes("authorization")) return errorResponse((err as Error).message, 401);
    if ((err as Error).message?.includes("image") || (err as Error).message?.includes("Image")) {
      return errorResponse((err as Error).message, 400);
    }
    return serverErrorResponse(err);
  }
}
