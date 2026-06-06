import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findNearestLocations } from "@/lib/locations/service";
export const dynamic = "force-dynamic";

const NearbyQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

// GET /api/locations/nearby?latitude=:lat&longitude=:lng - public reverse location lookup
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = NearbyQuerySchema.safeParse({
      latitude: searchParams.get("latitude") ?? searchParams.get("lat"),
      longitude: searchParams.get("longitude") ?? searchParams.get("lng"),
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return errorResponse("Latitude and longitude are required", 422, parsed.error.flatten());
    }

    const locations = await findNearestLocations(prisma, parsed.data);
    return successResponse({
      nearest: locations[0] ?? null,
      locations,
    });
  } catch (err) {
    console.error("[LOCATIONS/NEARBY/GET]", err);
    return serverErrorResponse(err);
  }
}
