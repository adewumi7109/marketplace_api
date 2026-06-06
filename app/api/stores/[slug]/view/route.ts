import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyticsDateKey, requestVisitorHash } from "@/lib/analytics";
export const dynamic = "force-dynamic";

// POST /api/stores/:slug/view - public store view tracking
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const store = await prisma.store.findFirst({
      where: { slug: params.slug, isActive: true },
      select: { id: true },
    });

    if (!store) return errorResponse("Store not found", 404);

    await prisma.storeView.upsert({
      where: {
        storeId_visitorHash_dateKey: {
          storeId: store.id,
          visitorHash: requestVisitorHash(req),
          dateKey: analyticsDateKey(),
        },
      },
      update: {},
      create: {
        storeId: store.id,
        visitorHash: requestVisitorHash(req),
        dateKey: analyticsDateKey(),
      },
    });

    return successResponse({ tracked: true });
  } catch (err) {
    console.error("[STORES/:slug/VIEW/POST]", err);
    return serverErrorResponse(err);
  }
}
