import { PrismaClient } from "@prisma/client";

export function normalizeLocationName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const radiusKm = 6371;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * radiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findNearestLocations(
  prisma: PrismaClient,
  input: { latitude: number; longitude: number; limit?: number }
) {
  const locations = await prisma.location.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: [{ state: "asc" }, { city: "asc" }],
  });

  return locations
    .map((location) => ({
      ...location,
      distanceKm: distanceKm(input, {
        latitude: location.latitude ?? 0,
        longitude: location.longitude ?? 0,
      }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, input.limit ?? 10);
}

export async function resolveLocation(
  prisma: PrismaClient,
  input: {
    locationId?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    allowCreate?: boolean;
  }
) {
  if (input.locationId) {
    const location = await prisma.location.findUnique({ where: { id: input.locationId } });
    if (!location) return null;
    return location;
  }

  if (!input.city || !input.state) return null;

  const city = normalizeLocationName(input.city);
  const state = normalizeLocationName(input.state);
  const country = normalizeLocationName(input.country || "Nigeria");

  const existing = await prisma.location.findFirst({
    where: {
      city: { equals: city, mode: "insensitive" },
      state: { equals: state, mode: "insensitive" },
      country: { equals: country, mode: "insensitive" },
    },
  });

  if (existing) return existing;
  if (!input.allowCreate) return null;

  return prisma.location.create({
    data: {
      city,
      state,
      country,
      latitude: input.latitude ?? undefined,
      longitude: input.longitude ?? undefined,
      isCustom: true,
    },
  });
}
