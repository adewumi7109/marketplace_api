import { successResponse, errorResponse, paginatedResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { CreateProductSchema } from "@/lib/validations/product";
import { getPaginationParams } from "@/utils/pagination";
import { generateSlug } from "@/utils/slug";
import { formDataToObject, isMultipartRequest, saveImageFile } from "@/lib/uploads";
import { attachProductMetrics } from "@/lib/productMetrics";

export const dynamic = "force-dynamic";

const CreateAuthenticatedProductSchema = CreateProductSchema.extend({
  storeId: z.string().cuid("Invalid store ID"),
});

async function parseProductRequest(req: NextRequest) {
  if (!isMultipartRequest(req)) {
    return { body: await req.json(), imageFiles: [] as File[] };
  }

  const formData = await req.formData();
  const body = formDataToObject(formData, {
    arrays: ["images"],
    booleans: ["inStock", "isNegotiable", "pushToMarketplace"],
    numbers: ["price"],
  });
  const imageFiles = [...formData.getAll("images"), ...formData.getAll("image")].filter(
    (value): value is File => value instanceof File && value.size > 0
  );

  return { body, imageFiles };
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
    const includeMetrics = searchParams.get("includeMetrics") === "true";
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
          marketplaceCategory: true,
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

    const productsWithMetrics = includeMetrics
      ? await attachProductMetrics(prisma, products)
      : products.map((product) => ({ ...product, viewCount: 0, whatsappClickCount: 0 }));

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
    const { body, imageFiles } = await parseProductRequest(req);
    const parsed = CreateAuthenticatedProductSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 422, parsed.error.flatten());

    const { name, categoryId, marketplaceCategoryId, locationId, storeId, pushToMarketplace, ...rest } = parsed.data;

    const [store, location] = await Promise.all([
      prisma.store.findFirst({ where: { id: storeId, userId: user.userId } }),
      locationId ? prisma.location.findUnique({ where: { id: locationId } }) : Promise.resolve(null),
    ]);

    if (!store) return errorResponse("Store not found for authenticated user", 404);
    const [category, marketplaceCategory] = await Promise.all([
      categoryId
        ? prisma.productCategory.findFirst({
            where: {
              id: categoryId,
              isActive: true,
              storeId: store.id,
            },
          })
        : Promise.resolve(null),
      marketplaceCategoryId
        ? prisma.productCategory.findFirst({
            where: { id: marketplaceCategoryId, isActive: true, storeId: null },
          })
        : Promise.resolve(null),
    ]);
    if (categoryId && !category) return errorResponse("Store category not found", 404);
    if (pushToMarketplace && !marketplaceCategoryId) return errorResponse("Marketplace category is required when publishing to marketplace", 422);
    if (marketplaceCategoryId && !marketplaceCategory) return errorResponse("Marketplace category not found", 404);
    if (locationId && !location) return errorResponse("Location not found", 404);

    const uploadedImages =
      imageFiles.length > 0
        ? await Promise.all(imageFiles.map((file) => saveImageFile(file, "products")))
        : [];
    const resolvedLocationId = locationId || store.locationId || undefined;
    const slug = await generateUniqueProductSlug(store.id, name);
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        storeId: store.id,
        categoryId,
        marketplaceCategoryId: pushToMarketplace ? marketplaceCategoryId : undefined,
        pushToMarketplace,
        locationId: resolvedLocationId,
        ...rest,
        images: [...(parsed.data.images ?? []), ...uploadedImages],
      },
      include: {
        category: true,
        marketplaceCategory: true,
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

    const result = { ...product, viewCount: 0, whatsappClickCount: 0 };

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
