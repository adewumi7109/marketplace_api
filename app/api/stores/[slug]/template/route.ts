import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { AssignTemplateSchema } from "@/lib/validations/template";
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
