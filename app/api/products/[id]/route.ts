import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, serverErrorResponse, successResponse } from "@/utils/response";

// GET /api/products/:id - public product detail
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        isActive: true,
        store: { isActive: true },
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

    if (!product) return errorResponse("Product not found", 404);

    return successResponse({
      ...product,
      viewCount: 0,
      whatsappClickCount: 0,
    });
  } catch (err) {
    console.error("[PRODUCTS/:id/GET]", err);
    return serverErrorResponse(err);
  }
}
