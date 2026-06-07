import { PrismaClient, Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { NIGERIA_LOCATIONS } from "../lib/locations/nigeria";

const prisma = new PrismaClient();

// ───────────────────── SUPABASE SETUP ─────────────────────
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("SUPABASE_URL missing");
if (!supabaseServiceRoleKey)
  throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket as any },
});

// ───────────────────── UTIL ─────────────────────
const toDecimal = (v: number) => new Prisma.Decimal(v);

// ───────────────────── USER HELPER ─────────────────────
async function ensureUser(email: string, password: string, name: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error && !error.message.includes("already")) throw error;

  if (data.user?.id) return data.user.id;

  const { data: list } = await supabaseAdmin.auth.admin.listUsers();

  const existing = list.users.find((u) => u.email === email);
  if (!existing) throw new Error(`User not found ${email}`);

  return existing.id;
}

// ───────────────────── 🌍 NIGERIA STATES + CAPITALS ─────────────────────
const nigeriaLocations = NIGERIA_LOCATIONS;

// ───────────────────── SMART LOCATION RESOLVER ─────────────────────
async function resolveLocation(input: {
  city: string;
  state?: string;
  country?: string;
}) {
  const city = input.city.trim();
  const state = input.state?.trim() || "Unknown";
  const country = input.country || "Nigeria";

  const exact = await prisma.location.findFirst({
    where: { city, state, country },
  });

  if (exact) return exact;

  const fuzzy = await prisma.location.findFirst({
    where: {
      city: { equals: city, mode: "insensitive" },
      state,
      country,
    },
  });

  if (fuzzy) return fuzzy;

  return await prisma.location.create({
    data: {
      city,
      state,
      country,
      isCustom: true,
    },
  });
}

// ───────────────────── MAIN SEED ─────────────────────
async function main() {
  console.log("🌱 Seeding marketplace...");

  const locationMap = new Map<string, any>();

  for (const loc of nigeriaLocations) {
    const created = await prisma.location.upsert({
      where: {
        city_state_country: {
          city: loc.city,
          state: loc.state,
          country: "Nigeria",
        },
      },
      update: {
        latitude: loc.latitude,
        longitude: loc.longitude,
        isCustom: false,
      },
      create: {
        city: loc.city,
        state: loc.state,
        country: "Nigeria",
        latitude: loc.latitude,
        longitude: loc.longitude,
        isCustom: false,
      },
    });

    locationMap.set(`${loc.city}-${loc.state}`, created);
  }

  const lagosIkeja =
    locationMap.get("Ikeja-Lagos") ||
    (await prisma.location.findFirst({
      where: { city: "Ikeja", state: "Lagos" },
    }));

  const abuja =
    locationMap.get("Abuja-FCT") ||
    (await prisma.location.findFirst({
      where: { city: "Abuja", state: "FCT" },
    }));

  const electronicsTemplate = await prisma.template.upsert({
    where: { code: "electronics_v1" },
    update: {},
    create: {
      name: "Electronics",
      code: "electronics_v1",
      type: "STORE",
      config: { layout: "list" },
    },
  });

  async function ensureProductCategory(name: string, slug: string) {
    return (
      (await prisma.productCategory.findFirst({ where: { slug, storeId: null } })) ||
      prisma.productCategory.create({ data: { name, slug } })
    );
  }

  const phoneCat = await ensureProductCategory("Smartphones", "smartphones");
  const laptopCat = await ensureProductCategory("Laptops", "laptops");

  const adminId = await ensureUser("admin@market.com", "Admin@1234", "Admin");
  const merchantId = await ensureUser("merchant@market.com", "Merchant@1234", "Merchant");

  const admin = await prisma.user.upsert({
    where: { email: "admin@market.com" },
    update: {},
    create: {
      id: adminId,
      email: "admin@market.com",
      name: "Admin",
      role: "ADMIN",
    },
  });

  const merchant = await prisma.user.upsert({
    where: { email: "merchant@market.com" },
    update: {},
    create: {
      id: merchantId,
      email: "merchant@market.com",
      name: "Merchant",
      role: "USER",
    },
  });

  const store = await prisma.store.upsert({
    where: { slug: "lagos-gadgets" },
    update: {},
    create: {
      name: "Lagos Gadgets",
      slug: "lagos-gadgets",
      description: "Electronics store in Nigeria",
      phone: "2348098765432",
      locationId: lagosIkeja?.id,
      latitude: 6.6088,
      longitude: 3.3515,
      userId: merchant.id,
      templateId: electronicsTemplate.id,
    },
  });

  console.log("🎉 SEED COMPLETE");
  console.log("📍 Locations seeded:", nigeriaLocations.length);
  console.log("Admin:", admin.email);
  console.log("Merchant:", merchant.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
