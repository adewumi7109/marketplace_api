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

const ProductConditionSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;

  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "NEW" || normalized === "BRAND_NEW") return "NEW";
  if (normalized.startsWith("USED")) return "USED";
  if (normalized === "REFURBISHED") return "REFURBISHED";

  return value;
}, z.enum(["NEW", "USED", "REFURBISHED"]));

export const CreateProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive"),
  condition: ProductConditionSchema.optional(),
  images: z.array(imagePath).default([]),
  inStock: z.boolean().default(true),
  isNegotiable: z.boolean().default(true),
  pushToMarketplace: z.boolean().default(false),
  locationId: z.string().cuid("Invalid location ID").optional(),
  categoryId: z.string().cuid("Invalid category ID").optional(),
  marketplaceCategoryId: z.string().cuid("Invalid marketplace category ID").optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
