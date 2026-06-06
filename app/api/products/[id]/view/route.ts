import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyticsDateKey, requestVisitorHash } from "@/lib/analytics";
export const dynamic = "force-dynamic";

// POST /api/products/:id/view - public product view tracking
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        isActive: true,
        store: { isActive: true },
      },
      select: {
        id: true,
        storeId: true,
      },
    });

    if (!product) return errorResponse("Product not found", 404);

    await prisma.productClick.upsert({
      where: {
        productId_source_visitorHash_dateKey: {
          productId: product.id,
          source: "view",
          visitorHash: requestVisitorHash(_req),
          dateKey: analyticsDateKey(),
        },
      },
      update: {},
      create: {
        productId: product.id,
        storeId: product.storeId,
        source: "view",
        visitorHash: requestVisitorHash(_req),
        dateKey: analyticsDateKey(),
      },
    });

    return successResponse({ tracked: true });
  } catch (err) {
    console.error("[PRODUCTS/:id/VIEW/POST]", err);
    return serverErrorResponse(err);
  }
}
