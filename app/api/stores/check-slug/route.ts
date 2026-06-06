import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/utils/slug";

export const dynamic = "force-dynamic";

// GET /api/stores/check-slug?slug=:slug&currentSlug=:currentSlug - public
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const value = searchParams.get("slug");
    const currentSlugValue = searchParams.get("currentSlug");

    if (!value) {
      return errorResponse("Slug is required", 422);
    }

    const slug = generateSlug(value);
    if (!slug) {
      return errorResponse("Invalid store slug", 422);
    }

    const currentSlug = currentSlugValue ? generateSlug(currentSlugValue) : null;
    const existing = await prisma.store.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });
    const belongsToCurrentStore = Boolean(existing && currentSlug && existing.slug === currentSlug);
    const exists = Boolean(existing && !belongsToCurrentStore);

    return successResponse({
      slug,
      exists,
      available: !exists,
    });
  } catch (err) {
    console.error("[STORES/CHECK-SLUG/GET]", err);
    return serverErrorResponse(err);
  }
}
