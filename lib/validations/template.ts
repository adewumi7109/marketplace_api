import { z } from "zod";

export const AssignTemplateSchema = z.object({
  templateId: z.string().cuid("Invalid template ID"),
});

export type AssignTemplateInput = z.infer<typeof AssignTemplateSchema>;
