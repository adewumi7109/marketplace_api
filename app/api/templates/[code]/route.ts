import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateAdmin } from "@/lib/auth";
import { z } from "zod";

const UpdateTemplateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  previewUrl: z.string().url().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/templates/:code — public
export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const template = await prisma.template.findUnique({
      where: { code: params.code },
      include: { _count: { select: { stores: true } } },
    });

    if (!template || !template.isActive) return errorResponse("Template not found", 404);
    return successResponse(template);
  } catch (err) {
    console.error("[TEMPLATES/:code/GET]", err);
    return serverErrorResponse(err);
  }
}

// PATCH /api/templates/:code — admin only
export async function PATCH(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    await authenticateAdmin(req);
    const body = await req.json();
    const parsed = UpdateTemplateSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 422, parsed.error.flatten());

    const { config, ...templateData } = parsed.data;
    const data: Prisma.TemplateUpdateInput = {
      ...templateData,
      ...(config !== undefined ? { config: config as Prisma.InputJsonValue } : {}),
    };

    const updated = await prisma.template.update({
      where: { code: params.code },
      data,
    });
    return successResponse(updated);
  } catch (err) {
    console.error("[TEMPLATES/:code/PATCH]", err);
    if ((err as Error).message?.includes("Admin")) return errorResponse((err as Error).message, 403);
    return serverErrorResponse(err);
  }
}
