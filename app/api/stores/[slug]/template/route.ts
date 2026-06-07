import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { AssignTemplateSchema } from "@/lib/validations/template";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const StoreTemplateConfigSchema = z.object({
  templateId: z.string().cuid("Invalid template ID").optional(),
  config: z.record(z.unknown()).default({}),
});

// PUT /api/stores/:slug/template — assign template to store
export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const user = await authenticate(req);
    const body = await req.json();
    const parsed = AssignTemplateSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 422, parsed.error.flatten());

    const store = await prisma.store.findUnique({ where: { slug: params.slug } });
    if (!store) return errorResponse("Store not found", 404);
    if (store.userId !== user.userId && user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    const template = await prisma.template.findUnique({ where: { id: parsed.data.templateId } });
    if (!template || !template.isActive) return errorResponse("Template not found or inactive", 404);

    const updated = await prisma.store.update({
      where: { slug: params.slug },
      data: { templateId: parsed.data.templateId },
      include: { template: true },
    });

    return successResponse(updated);
  } catch (err) {
    console.error("[STORES/:slug/TEMPLATE/PUT]", err);
    if ((err as Error).message?.includes("authorization")) return errorResponse((err as Error).message, 401);
    return serverErrorResponse(err);
  }
}

// PATCH /api/stores/:slug/template - update this store's template settings only
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const user = await authenticate(req);
    const body = await req.json();
    const parsed = StoreTemplateConfigSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 422, parsed.error.flatten());

    const store = await prisma.store.findUnique({ where: { slug: params.slug } });
    if (!store) return errorResponse("Store not found", 404);
    if (store.userId !== user.userId && user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    if (parsed.data.templateId) {
      const template = await prisma.template.findUnique({ where: { id: parsed.data.templateId } });
      if (!template || !template.isActive) return errorResponse("Template not found or inactive", 404);
    }

    const updated = await prisma.store.update({
      where: { slug: params.slug },
      data: {
        ...(parsed.data.templateId ? { templateId: parsed.data.templateId } : {}),
        templateConfig: parsed.data.config as Prisma.InputJsonObject,
      },
      include: { template: true, location: true },
    });

    return successResponse(updated);
  } catch (err) {
    console.error("[STORES/:slug/TEMPLATE/PATCH]", err);
    if ((err as Error).message?.includes("authorization")) return errorResponse((err as Error).message, 401);
    return serverErrorResponse(err);
  }
}
