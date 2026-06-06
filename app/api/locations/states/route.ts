import { successResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

// GET /api/locations/states - public state list with cities, Jiji-style
export async function GET(_req: NextRequest) {
  try {
    const locations = await prisma.location.findMany({
      orderBy: [{ state: "asc" }, { city: "asc" }],
    });

    const states = Array.from(
      locations.reduce((map, location) => {
        const current = map.get(location.state) ?? {
          state: location.state,
          country: location.country,
          cityCount: 0,
          cities: [] as typeof locations,
        };

        current.cityCount += 1;
        current.cities.push(location);
        map.set(location.state, current);
        return map;
      }, new Map<string, { state: string; country: string; cityCount: number; cities: typeof locations }>())
    ).map(([, value]) => value);

    return successResponse(states);
  } catch (err) {
    console.error("[LOCATIONS/STATES/GET]", err);
    return serverErrorResponse(err);
  }
}
