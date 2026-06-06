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

export const CreateProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive"),
  condition: z.enum(["NEW", "USED", "REFURBISHED"]).optional(),
  images: z.array(imagePath).default([]),
  inStock: z.boolean().default(true),
  isNegotiable: z.boolean().default(true),
  locationId: z.string().cuid("Invalid location ID").optional(),
  categoryId: z.string().cuid("Invalid category ID"),
});

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
