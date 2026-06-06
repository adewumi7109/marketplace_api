import { z } from "zod";

const imagePath = z.string().refine(
  (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return value.startsWith("/uploads/");
    }
  },
  { message: "Invalid image URL or upload path" }
);

const colorHex = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a valid hex color");

export const CreateStoreSchema = z.object({
  name: z.string().min(2, "Store name must be at least 2 characters"),
  slug: z.string().min(2, "Store slug must be at least 2 characters").optional(),
  description: z.string().optional(),
  logo: imagePath.optional(),
  banner: imagePath.optional(),
  primaryColor: colorHex.optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  locationId: z.string().cuid("Invalid location ID").optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  templateId: z.string().cuid("Invalid template ID"),
});

export const UpdateStoreSchema = CreateStoreSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;
export type UpdateStoreInput = z.infer<typeof UpdateStoreSchema>;
