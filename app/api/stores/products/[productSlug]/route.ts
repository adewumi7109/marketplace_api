import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/stores/:slug/products/:productSlug - public
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string; productSlug: string } }
) {
  try {
    const product = await prisma.product.findFirst({
      where: {
    isActive: true,
    slug: params.productSlug,
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
        },
      },
    });

    if (!product) {
      return errorResponse("Product not found", 404);
    }

    const result = {
      ...product,
      viewCount: 0,
      whatsappClickCount: 0,
    };

    return successResponse(result);
  } catch (err) {
    console.error("[STORES/:slug/PRODUCTS/:productSlug/GET]", err);
    return serverErrorResponse(err);
  }
}
