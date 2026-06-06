import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
export const dynamic = "force-dynamic";

// GET /api/me — get current user profile + their stores
export async function GET(req: NextRequest) {
  try {
    const payload = await authenticate(req);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        stores: {
          include: {
            template: true,
            location: true,
            _count: { select: { products: true, storeViews: true } },
          },
        },
      },
    });

    if (!user) return errorResponse("User not found", 404);
    return successResponse(user);
  } catch (err) {
    console.error("[ME/GET]", err);
    if ((err as Error).message?.includes("authorization") || (err as Error).message?.includes("User not found")) {
      return errorResponse((err as Error).message, 401);
    }
    return serverErrorResponse(err);
  }
}
