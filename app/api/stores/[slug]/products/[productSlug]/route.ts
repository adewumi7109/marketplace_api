import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachProductMetrics } from "@/lib/productMetrics";

// GET /api/stores/:slug/products/:productSlug - public
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string; productSlug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        logo: true,
        banner: true,
        bannerText: true,
        description: true,
        primaryColor: true,
        storeAddress: true,
        latitude: true,
        longitude: true,
        locationId: true,
        isVerified: true,
        location: true,
      },
    });

    if (!store) return errorResponse("Store not found", 404);

    const product = await prisma.product.findFirst({
      where: {
        storeId: store.id,
        OR: [
          { slug: params.productSlug },
          { id: params.productSlug },
        ],
      },
      include: {
        category: true,
        marketplaceCategory: true,
        location: true,
      },
    });

    if (!product || !product.isActive) {
      return errorResponse("Product not found", 404);
    }

    const [productWithMetrics] = await attachProductMetrics(prisma, [product]);
    const result = {
      ...productWithMetrics,
      store,
    };

    return successResponse(result);
  } catch (err) {
    console.error("[STORES/:slug/PRODUCTS/:productSlug/GET]", err);
    return serverErrorResponse(err);
  }
}
