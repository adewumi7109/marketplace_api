import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { weekStart } from "@/lib/analytics";
export const dynamic = "force-dynamic";

// GET /api/me/analytics - authenticated seller dashboard metrics
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);

    const stores = await prisma.store.findMany({
      where: { userId: user.userId },
      select: {
        id: true,
        _count: { select: { products: true } },
      },
    });

    const storeIds = stores.map((store) => store.id);
    const totalProducts = stores.reduce((total, store) => total + store._count.products, 0);

    if (storeIds.length === 0) {
      return successResponse({
        totalProducts: 0,
        storeViewsThisWeek: 0,
        whatsappClicks: 0,
        recentActivity: [],
      });
    }

    const [storeViewsThisWeek, whatsappClicks, recentActivity] = await Promise.all([
      prisma.storeView.count({
        where: { storeId: { in: storeIds }, createdAt: { gte: weekStart() } },
      }),
      prisma.productClick.count({
        where: { storeId: { in: storeIds }, source: "whatsapp_order_click" },
      }),
      prisma.productClick.findMany({
        where: {
          storeId: { in: storeIds },
          source: { in: ["view", "whatsapp_order_click"] },
        },
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true, slug: true } },
          store: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);

    return successResponse({
      totalProducts,
      storeViewsThisWeek,
      whatsappClicks,
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        type: activity.source,
        createdAt: activity.createdAt,
        product: activity.product,
        store: activity.store,
      })),
    });
  } catch (err) {
    console.error("[ME/ANALYTICS/GET]", err);
    if (
      (err as Error).message?.includes("authorization") ||
      (err as Error).message?.includes("User not found")
    ) {
      return errorResponse((err as Error).message, 401);
    }
    return serverErrorResponse(err);
  }
}
