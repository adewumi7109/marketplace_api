import { paginatedResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@/utils/pagination";
import { attachProductMetrics } from "@/lib/productMetrics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const { page, limit, skip } = getPaginationParams(searchParams);
    const includeMetrics = searchParams.get("includeMetrics") === "true";

    // ───────────────────── FILTERS ─────────────────────
    const categoryId = searchParams.get("categoryId");
    const storeId = searchParams.get("storeId");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const search = searchParams.get("search");
    const inStock = searchParams.get("inStock");

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    const sort = searchParams.get("sort") ?? "newest";

    // ───────────────────── WHERE CLAUSE ─────────────────────
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      pushToMarketplace: true,
      marketplaceCategoryId: { not: null },

      // CATEGORY FILTER
      ...(categoryId && { marketplaceCategoryId: categoryId }),

      // STORE FILTER
      ...(storeId && { storeId }),

      // CITY FILTER (via Location relation)
      ...(city && {
        location: {
          city: {
            equals: city,
            mode: "insensitive",
          },
        },
      }),
      ...(state && {
        location: {
          state: {
            equals: state,
            mode: "insensitive",
          },
        },
      }),

      // STOCK FILTER
      ...(inStock !== null
        ? { inStock: inStock === "true" }
        : {}),

      // PRICE RANGE
      ...((minPrice || maxPrice) && {
        price: {
          gte: minPrice ? new Prisma.Decimal(minPrice) : undefined,
          lte: maxPrice ? new Prisma.Decimal(maxPrice) : undefined,
        },
      }),

      // SEARCH (name + description)
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }),
    };

    // ───────────────────── SORTING ─────────────────────
    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (sort) {
        case "price_asc":
          return { price: "asc" };

        case "price_desc":
          return { price: "desc" };

        case "oldest":
          return { createdAt: "asc" };

        case "newest":
        default:
          return { createdAt: "desc" };
      }
    })();

    // ───────────────────── QUERY ─────────────────────
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
              latitude: true,
              longitude: true,
              locationId: true,
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
    console.error("[PRODUCT_FETCH_ERROR]", err);
    return serverErrorResponse(err);
  }
}
