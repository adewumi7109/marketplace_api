import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { UpdateStoreSchema } from "@/lib/validations/store";
import { formDataToObject, isMultipartRequest, saveImageFile } from "@/lib/uploads";
import { generateSlug } from "@/utils/slug";
import { attachProductMetrics } from "@/lib/productMetrics";

// GET /api/stores/:slug — public
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      include: {
        template: true,
        location: true,
        user: { select: { id: true, name: true } },
        products: {
          where: { isActive: true },
          include: { category: true, marketplaceCategory: true, location: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: { select: { products: true } },
      },
    });

    if (!store) return errorResponse("Store not found", 404);

    const products = await attachProductMetrics(prisma, store.products);
    const storeViewCount = await prisma.storeView.count({ where: { storeId: store.id } });
    return successResponse({ ...store, products, storeViewCount });
  } catch (err) {
    console.error("[STORES/:slug/GET]", err);
    return serverErrorResponse(err);
  }
}

// PATCH /api/stores/:slug — owner only
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

    const { slug: requestedSlug, ...data } = parsed.data;
    const updateData: Prisma.StoreUpdateInput = { ...data };

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
      include: { template: true, location: true },
    });

    return successResponse(updated);
  } catch (err) {
    console.error("[STORES/:slug/PATCH]", err);
    if ((err as Error).message?.includes("authorization")) return errorResponse((err as Error).message, 401);
    if ((err as Error).message?.includes("image") || (err as Error).message?.includes("Image")) {
      return errorResponse((err as Error).message, 400);
    }
    return serverErrorResponse(err);
  }
}

// DELETE /api/stores/:slug — owner only
export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const user = await authenticate(req);

    const store = await prisma.store.findUnique({ where: { slug: params.slug } });
    if (!store) return errorResponse("Store not found", 404);
    if (store.userId !== user.userId && user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    await prisma.store.delete({ where: { slug: params.slug } });
    return successResponse({ message: "Store deleted successfully" });
  } catch (err) {
    console.error("[STORES/:slug/DELETE]", err);
    if ((err as Error).message?.includes("authorization")) return errorResponse((err as Error).message, 401);
    return serverErrorResponse(err);
  }
}
