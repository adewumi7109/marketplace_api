import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { normalizeLocationName } from "@/lib/locations/service";

const CreateLocationSchema = z.object({
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  country: z.string().trim().min(2).default("Nigeria"),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const state = searchParams.get("state");
    const city = searchParams.get("city");
    const country = searchParams.get("country");
    const q = searchParams.get("q") ?? searchParams.get("search");
    const hasProducts = searchParams.get("hasProducts") === "true";
    const limitValue = Number(searchParams.get("limit"));
    const take = Number.isFinite(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : undefined;

    const where: Prisma.LocationWhereInput = {
      ...(state && { state: { equals: state, mode: "insensitive" } }),
      ...(country && { country: { equals: country, mode: "insensitive" } }),
      ...(city
        ? { city: { equals: city, mode: "insensitive" } }
        : q
          ? { city: { contains: q, mode: "insensitive" } }
          : {}),
      ...(hasProducts && {
        products: {
          some: {
            isActive: true,
          },
        },
      }),
    };

    const locations = await prisma.location.findMany({
      where,
      ...(take ? { take } : {}),
      orderBy: [
        { state: "asc" },
        { city: "asc" },
      ],
    });

    return successResponse(locations);
  } catch (err) {
    console.error("[LOCATIONS/GET]", err);
    return serverErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await authenticate(req);

    const body = await req.json();
    const parsed = CreateLocationSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const city = normalizeLocationName(parsed.data.city);
    const state = normalizeLocationName(parsed.data.state);
    const country = normalizeLocationName(parsed.data.country);

    const existing = await prisma.location.findFirst({
      where: {
        city: { equals: city, mode: "insensitive" },
        state: { equals: state, mode: "insensitive" },
        country: { equals: country, mode: "insensitive" },
      },
    });

    if (existing) return successResponse(existing);

    const location = await prisma.location.create({
      data: {
        city,
        state,
        country,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        isCustom: true,
      },
    });

    return successResponse(location, 201);
  } catch (err) {
    console.error("[LOCATIONS/POST]", err);
    if (
      (err as Error).message?.includes("authorization") ||
      (err as Error).message?.includes("User not found")
    ) {
      return errorResponse((err as Error).message, 401);
    }
    return serverErrorResponse(err);
  }
}
