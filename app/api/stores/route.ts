import { successResponse, errorResponse, paginatedResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { CreateStoreSchema } from "@/lib/validations/store";
import { generateSlug } from "@/utils/slug";
import { getPaginationParams } from "@/utils/pagination";
import { formDataToObject, isMultipartRequest, saveImageFile } from "@/lib/uploads";
import { resolveLocation } from "@/lib/locations/service";

export const dynamic = "force-dynamic";

// GET /api/stores — public, paginated
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const isActive = searchParams.get("isActive");

    const where = {
      ...(isActive !== null ? { isActive: isActive !== "false" } : { isActive: true }),
    };

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        skip,
        take: limit,
        include: {
          template: { select: { id: true, name: true, code: true, config: true } },
          location: true,
          user: { select: { id: true, name: true } },
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.store.count({ where }),
    ]);

    return paginatedResponse(stores, total, page, limit);
  } catch (err) {
    console.error("[STORES/GET]", err);
    return serverErrorResponse(err);
  }
}

// POST /api/stores — authenticated
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    let body: Record<string, unknown>;

    if (isMultipartRequest(req)) {
      const formData = await req.formData();
      body = formDataToObject(formData);
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

    const parsed = CreateStoreSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const {
      name,
      slug: requestedSlug,
      templateId,
      locationId,
      city,
      state,
      country,
      latitude,
      longitude,
      ...rest
    } = parsed.data;

    if ((city || state) && (!city || !state)) {
      return errorResponse("Both city and state are required for store location", 422);
    }

    // Verify related records exist before creating the store
    const [template, location] = await Promise.all([
      prisma.template.findUnique({ where: { id: templateId } }),
      resolveLocation(prisma, {
        locationId,
        city,
        state,
        country,
        latitude,
        longitude,
        allowCreate: true,
      }),
    ]);
    if (!template) return errorResponse("Template not found", 404);
    if ((locationId || city || state) && !location) return errorResponse("Location not found", 404);

    const slug = generateSlug(requestedSlug ?? name);
    if (!slug) return errorResponse("Invalid store slug", 422);

    const existing = await prisma.store.findUnique({ where: { slug } });
    if (existing) return errorResponse("Store slug already exists", 409);

    const store = await prisma.store.create({
      data: {
        name,
        slug,
        templateId,
        locationId: location?.id,
        latitude: latitude ?? location?.latitude,
        longitude: longitude ?? location?.longitude,
        userId: user.userId,
        ...rest,
      },
      include: {
        template: true,
        location: true,
      },
    });

    return successResponse(store, 201);
  } catch (err) {
    console.error("[STORES/POST]", err);
    if ((err as Error).message?.includes("authorization")) {
      return errorResponse((err as Error).message, 401);
    }
    if ((err as Error).message?.includes("image") || (err as Error).message?.includes("Image")) {
      return errorResponse((err as Error).message, 400);
    }
    return serverErrorResponse(err);
  }
}
