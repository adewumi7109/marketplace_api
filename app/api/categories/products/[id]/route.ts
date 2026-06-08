import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { CreateCategorySchema } from "@/lib/validations/category";
import { generateSlug } from "@/utils/slug";

async function authorizeCategory(req: NextRequest, id: string) {
  const user = await authenticate(req);
  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: { store: { select: { id: true, userId: true } } },
  });

  if (!category || category.isActive === false) {
    return { user, category: null, error: errorResponse("Category not found", 404) };
  }

  if (!category.storeId && user.role !== "ADMIN") {
    return { user, category, error: errorResponse("Admin access required", 403) };
  }

  if (category.storeId && category.store?.userId !== user.userId && user.role !== "ADMIN") {
    return { user, category, error: errorResponse("Forbidden", 403) };
  }

  return { user, category, error: null };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authorization = await authorizeCategory(req, params.id);
    if (authorization.error || !authorization.category) return authorization.error;

    const body = await req.json();
    const parsed = CreateCategorySchema.partial().safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 422, parsed.error.flatten());

    const data = { ...parsed.data };
    const nextSlug = data.name ? generateSlug(data.name) : undefined;
    if (data.name && !nextSlug) return errorResponse("Invalid category name", 422);

    if (nextSlug) {
      const existing = await prisma.productCategory.findFirst({
        where: {
          slug: nextSlug,
          storeId: authorization.category.storeId,
          id: { not: params.id },
        },
        select: { id: true },
      });
      if (existing) return errorResponse("Category already exists", 409);
    }

    const updated = await prisma.productCategory.update({
      where: { id: params.id },
      data: { ...data, ...(nextSlug ? { slug: nextSlug } : {}) },
    });
    return successResponse(updated);
  } catch (err) {
    if ((err as Error).message?.includes("authorization")) return errorResponse((err as Error).message, 401);
    return serverErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authorization = await authorizeCategory(req, params.id);
    if (authorization.error || !authorization.category) return authorization.error;

    await prisma.$transaction([
      prisma.product.updateMany({
        where: { categoryId: params.id },
        data: { categoryId: null },
      }),
      prisma.product.updateMany({
        where: { marketplaceCategoryId: params.id },
        data: { marketplaceCategoryId: null, pushToMarketplace: false },
      }),
      prisma.productCategory.update({ where: { id: params.id }, data: { isActive: false } }),
    ]);
    return successResponse({ message: "Category deactivated" });
  } catch (err) {
    if ((err as Error).message?.includes("authorization")) return errorResponse((err as Error).message, 401);
    return serverErrorResponse(err);
  }
}
