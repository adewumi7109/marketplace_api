import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { UpdateStoreSchema } from "@/lib/validations/store";
import { formDataToObject, isMultipartRequest, saveImageFile } from "@/lib/uploads";
import { generateSlug } from "@/utils/slug";
import { resolveLocation } from "@/lib/locations/service";

export const dynamic = "force-dynamic";

// GET /api/stores/:slug/edit - owner/admin edit payload
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const user = await authenticate(req);

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      include: {
        template: true,
        location: true,
        _count: { select: { products: true } },
      },
    });

    if (!store) return errorResponse("Store not found", 404);
    if (store.userId !== user.userId && user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    const templates = await prisma.template.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return successResponse({
      store,
      options: {
        templates,
      },
    });
  } catch (err) {
    console.error("[STORES/:slug/EDIT/GET]", err);
    if (
      (err as Error).message?.includes("authorization") ||
      (err as Error).message?.includes("User not found")
    ) {
      return errorResponse((err as Error).message, 401);
    }
    return serverErrorResponse(err);
  }
}

// PATCH /api/stores/:slug/edit - owner/admin update
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const user = await authenticate(req);
    const store = await prisma.store.findUnique({ where: { slug: params.slug } });

    if (!store) return errorResponse("Store not found", 404);
    if (store.userId !== user.userId && user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    let body: Record<string, unknown>;

    if (isMultipartRequest(req)) {
      const formData = await req.formData();
      body = formDataToObject(formData, { booleans: ["isActive"] });
      ["address", "storeAddress", "bannerText", "description"].forEach((key) => {
        const value = formData.get(key);
        if (typeof value === "string") body[key] = value;
      });
      const logo = formData.get("logo");
      const banner = formData.get("banner");

      if (logo instanceof File && logo.size > 0) {
        body.logo = await saveImageFile(logo, "stores");
      }
      if (banner instanceof File && banner.size > 0) {
        body.banner = await saveImageFile(banner, "stores");
      }
    } else {
      body = await req.json();
    }

    const parsed = UpdateStoreSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const {
      slug: requestedSlug,
      locationId,
      city,
      state,
      country,
      latitude,
      longitude,
      ...data
    } = parsed.data;
    const updateData: Prisma.StoreUpdateInput = { ...data };
    const nextAddress = data.storeAddress ?? data.address;
    if (nextAddress !== undefined) {
      updateData.storeAddress = nextAddress;
      updateData.address = nextAddress;
    }

    if ((city || state) && (!city || !state)) {
      return errorResponse("Both city and state are required for store location", 422);
    }

    if (locationId !== undefined || city || state) {
      const location = await resolveLocation(prisma, {
        locationId,
        city,
        state,
        country,
        latitude,
        longitude,
        allowCreate: true,
      });

      if (!location) return errorResponse("Location not found", 404);

      updateData.location = { connect: { id: location.id } };
      updateData.latitude = latitude ?? location.latitude;
      updateData.longitude = longitude ?? location.longitude;
    } else {
      if (latitude !== undefined) updateData.latitude = latitude;
      if (longitude !== undefined) updateData.longitude = longitude;
    }

    if (requestedSlug !== undefined) {
      const slug = generateSlug(requestedSlug);
      if (!slug) return errorResponse("Invalid store slug", 422);

      const existing = await prisma.store.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (existing && existing.id !== store.id) {
        return errorResponse("Store slug already exists", 409);
      }

      updateData.slug = slug;
    }

    const updated = await prisma.store.update({
      where: { slug: params.slug },
      data: updateData,
      include: {
        template: true,
        location: true,
        _count: { select: { products: true } },
      },
    });

    return successResponse(updated);
  } catch (err) {
    console.error("[STORES/:slug/EDIT/PATCH]", err);
    if (
      (err as Error).message?.includes("authorization") ||
      (err as Error).message?.includes("User not found")
    ) {
      return errorResponse((err as Error).message, 401);
    }
    if ((err as Error).message?.includes("image") || (err as Error).message?.includes("Image")) {
      return errorResponse((err as Error).message, 400);
    }
    return serverErrorResponse(err);
  }
}
