import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, authenticateAdmin } from "@/lib/auth";
import { CreateCategorySchema } from "@/lib/validations/category";
import { generateSlug } from "@/utils/slug";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const categories = await prisma.productCategory.findMany({
      where: {
        isActive: true,
        ...(storeId ? { storeId } : { storeId: null }),
      },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return successResponse(categories);
  } catch (err) {
    return serverErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    const body = await req.json();
    const parsed = CreateCategorySchema.safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 422, parsed.error.flatten());

    const storeId = typeof body.storeId === "string" ? body.storeId : null;
    if (!storeId) {
      await authenticateAdmin(req);
    } else {
      const store = await prisma.store.findFirst({ where: { id: storeId, userId: user.userId } });
      if (!store && user.role !== "ADMIN") return errorResponse("Store not found for authenticated user", 404);
    }

    const slug = generateSlug(parsed.data.name);
    if (!slug) return errorResponse("Invalid category name", 422);

    const existing = await prisma.productCategory.findFirst({
      where: { slug, storeId },
    });
    if (existing) return errorResponse("Category already exists", 409);

    const category = await prisma.productCategory.create({
      data: { ...parsed.data, slug, storeId },
    });
    return successResponse(category, 201);
  } catch (err) {
    if ((err as Error).message?.includes("authorization")) return errorResponse((err as Error).message, 401);
    if ((err as Error).message?.includes("Admin")) return errorResponse((err as Error).message, 403);
    return serverErrorResponse(err);
  }
}
