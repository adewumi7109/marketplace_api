import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdmin } from "@/lib/auth";
import { CreateCategorySchema } from "@/lib/validations/category";
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticateAdmin(req);
    const body = await req.json();
    const parsed = CreateCategorySchema.partial().safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 422, parsed.error.flatten());
    const updated = await prisma.productCategory.update({ where: { id: params.id }, data: parsed.data });
    return successResponse(updated);
  } catch (err) {
    if ((err as Error).message?.includes("Admin")) return errorResponse((err as Error).message, 403);
    return serverErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticateAdmin(req);
    await prisma.productCategory.update({ where: { id: params.id }, data: { isActive: false } });
    return successResponse({ message: "Category deactivated" });
  } catch (err) {
    if ((err as Error).message?.includes("Admin")) return errorResponse((err as Error).message, 403);
    return serverErrorResponse(err);
  }
}
