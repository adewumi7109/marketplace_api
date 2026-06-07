import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { UpdateProductSchema } from "@/lib/validations/product";
import { formDataToObject, isMultipartRequest, saveImageFile } from "@/lib/uploads";
import { attachProductMetrics } from "@/lib/productMetrics";

export const dynamic = "force-dynamic";

async function parseProductRequest(req: NextRequest) {
  if (!isMultipartRequest(req)) {
    return req.json();
  }

  const formData = await req.formData();
  const body = formDataToObject(formData, {
    arrays: ["images"],
    booleans: ["inStock", "isNegotiable", "isActive", "pushToMarketplace"],
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

async function findAuthenticatedProduct(userId: string, productId: string) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      store: { userId },
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
}

// GET /api/me/products/:id - authenticated user
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticate(req);
    const product = await findAuthenticatedProduct(user.userId, params.id);
    if (!product) return errorResponse("Product not found", 404);

    const [productWithMetrics] = await attachProductMetrics(prisma, [product]);
    return successResponse(productWithMetrics);
  } catch (err) {
    console.error("[ME/PRODUCTS/:id/GET]", err);
    if ((err as Error).message?.includes("authorization")) return errorResponse((err as Error).message, 401);
    return serverErrorResponse(err);
  }
}

// PATCH /api/me/products/:id - authenticated user
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticate(req);
    const existing = await findAuthenticatedProduct(user.userId, params.id);
    if (!existing) return errorResponse("Product not found", 404);

    const body = await parseProductRequest(req);
    const parsed = UpdateProductSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 422, parsed.error.flatten());

    const { categoryId, marketplaceCategoryId, locationId, pushToMarketplace } = parsed.data;
    const [location] = await Promise.all([
      locationId ? prisma.location.findUnique({ where: { id: locationId } }) : Promise.resolve(null),
    ]);

    const category = categoryId
      ? await prisma.productCategory.findFirst({
          where: {
            id: categoryId,
            isActive: true,
            storeId: existing.storeId,
          },
        })
      : null;
    const marketplaceCategory = marketplaceCategoryId
      ? await prisma.productCategory.findFirst({
          where: { id: marketplaceCategoryId, isActive: true, storeId: null },
        })
      : null;

    const willPublish = pushToMarketplace ?? existing.pushToMarketplace;
    const nextMarketplaceCategoryId =
      marketplaceCategoryId !== undefined ? marketplaceCategoryId : existing.marketplaceCategoryId;

    if (categoryId && !category) return errorResponse("Store category not found", 404);
    if (willPublish && !nextMarketplaceCategoryId) {
      return errorResponse("Marketplace category is required when publishing to marketplace", 422);
    }
    if (marketplaceCategoryId && !marketplaceCategory) return errorResponse("Marketplace category not found", 404);
    if (locationId && !location) return errorResponse("Location not found", 404);

    const updateData = {
      ...parsed.data,
      ...(pushToMarketplace === false ? { marketplaceCategoryId: null } : {}),
    };

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
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

    const [updatedWithMetrics] = await attachProductMetrics(prisma, [updated]);
    return successResponse(updatedWithMetrics);
  } catch (err) {
    console.error("[ME/PRODUCTS/:id/PATCH]", err);
    if ((err as Error).message?.includes("authorization")) return errorResponse((err as Error).message, 401);
    if ((err as Error).message?.includes("image") || (err as Error).message?.includes("Image")) {
      return errorResponse((err as Error).message, 400);
    }
    return serverErrorResponse(err);
  }
}

// DELETE /api/me/products/:id - authenticated user
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticate(req);
    const existing = await findAuthenticatedProduct(user.userId, params.id);
    if (!existing) return errorResponse("Product not found", 404);

    await prisma.product.delete({ where: { id: params.id } });
    return successResponse({ message: "Product deleted" });
  } catch (err) {
    console.error("[ME/PRODUCTS/:id/DELETE]", err);
    if ((err as Error).message?.includes("authorization")) return errorResponse((err as Error).message, 401);
    return serverErrorResponse(err);
  }
}
