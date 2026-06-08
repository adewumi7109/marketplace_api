import { randomUUID } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function isMultipartRequest(req: Request) {
  return req.headers.get("content-type")?.includes("multipart/form-data") ?? false;
}

export async function saveImageFile(
  file: File,
  folder: "stores" | "products"
) {
  if (!MIME_EXTENSIONS[file.type]) {
    throw new Error("Only JPG, PNG, or WebP images are allowed");
  }

  if (file.size <= 0) {
    throw new Error("Image file is empty or invalid");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be 10MB or smaller");
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const extension = MIME_EXTENSIONS[file.type];

  const filename = `${folder}/${Date.now()}-${randomUUID()}${extension}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from("uploads")
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage
    .from("uploads")
    .getPublicUrl(filename);

  return publicUrl;
}

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function formDataToObject(
  formData: FormData,
  options: {
    arrays?: string[];
    booleans?: string[];
    numbers?: string[];
  } = {}
) {
  const data: Record<string, unknown> = {};
  const arrays = new Set(options.arrays ?? []);
  const booleans = new Set(options.booleans ?? []);
  const numbers = new Set(options.numbers ?? []);

  for (const [key, value] of Array.from(formData.entries())) {
    if (value instanceof File) continue;

    if (arrays.has(key)) {
      data[key] = parseArrayValue(formData, key);
      continue;
    }

    if (booleans.has(key)) {
      data[key] = value === "true" || value === "1";
      continue;
    }

    if (numbers.has(key)) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) data[key] = parsed;
      continue;
    }

    if (value.length > 0) data[key] = value;
  }

  for (const key of Array.from(arrays)) {
    if (!(key in data)) {
      const parsed = parseArrayValue(formData, key);
      if (parsed.length > 0) data[key] = parsed;
    }
  }

  return data;
}

export function parseArrayValue(formData: FormData, key: string) {
  const values = formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (values.length === 1) {
    try {
      const parsed = JSON.parse(values[0]);
      if (Array.isArray(parsed)) return parsed.filter((value) => typeof value === "string" && value.length > 0);
    } catch {
      return values[0].split(",").map((value) => value.trim()).filter(Boolean);
    }
  }

  return values;
}

export function getFormString(formData: FormData, key: string) {
  return getStringValue(formData, key);
}
