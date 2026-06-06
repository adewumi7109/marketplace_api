import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWhatsAppLink } from "@/utils/slug";
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
        description: true,
        primaryColor: true,
        latitude: true,
        longitude: true,
        locationId: true,
        isVerified: true,
        location: true,
      },
    });

    if (!store) return errorResponse("Store not found", 404);

    const product = await prisma.product.findUnique({
      where: {
        storeId_slug: {
          storeId: store.id,
          slug: params.productSlug,
        },
      },
      include: {
        category: true,
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
      ...(store.phone
        ? {
            whatsappOrderLink: generateWhatsAppLink(
              store.phone,
              product.name,
              product.price?.toString() ?? "0"
            ),
          }
        : {}),
    };

    return successResponse(result);
  } catch (err) {
    console.error("[STORES/:slug/PRODUCTS/:productSlug/GET]", err);
    return serverErrorResponse(err);
  }
}
