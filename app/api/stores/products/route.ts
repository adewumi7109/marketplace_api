import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPaginationParams } from "@/utils/pagination";
import { errorResponse, paginatedResponse, serverErrorResponse } from "@/utils/response";

// GET /api/stores/:slug/products - public store products
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const inStock = searchParams.get("inStock");
    const sort = searchParams.get("sort") ?? "newest";

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, isActive: true },
    });

    if (!store || !store.isActive) return errorResponse("Store not found", 404);

    const where: Prisma.ProductWhereInput = {
      storeId: store.id,
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(inStock !== null ? { inStock: inStock === "true" } : {}),
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
        },
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    return paginatedResponse(
      products.map((product) => ({ ...product, viewCount: 0, whatsappClickCount: 0 })),
      total,
      page,
      limit
    );
  } catch (err) {
    console.error("[STORES/:slug/PRODUCTS/GET]", err);
    return serverErrorResponse(err);
  }
}
