import { paginatedResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaginationParams } from "@/utils/pagination";

export const dynamic = "force-dynamic";

// GET /api/marketplace — search & filter stores
// Query params: q, city, country, page, limit
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const q = searchParams.get("q");
    const city = searchParams.get("city");
    const country = searchParams.get("country");

    const where: any = { isActive: true };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const locationWhere: any = {};
    if (city) locationWhere.city = { contains: city, mode: "insensitive" };
    if (country) locationWhere.country = { contains: country, mode: "insensitive" };
    if (Object.keys(locationWhere).length > 0) where.location = { is: locationWhere };

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logo: true,
          banner: true,
          location: { select: { city: true, state: true, country: true } },
          isVerified: true,
          template: { select: { id: true, name: true, code: true, config: true } },
          _count: { select: { products: true } },
        },
        orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
      }),
      prisma.store.count({ where }),
    ]);

    const results = stores.map(({ location, ...store }) => ({
      ...store,
      city: location?.city ?? null,
      country: location?.country ?? null,
      location,
    }));

    return paginatedResponse(results, total, page, limit);
  } catch (err) {
    console.error("[MARKETPLACE/GET]", err);
    return serverErrorResponse(err);
  }
}
