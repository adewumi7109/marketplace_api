import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdmin } from "@/lib/auth";
import { CreateCategorySchema } from "@/lib/validations/category";
import { generateSlug } from "@/utils/slug";

export async function GET() {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return successResponse(categories);
  } catch (err) {
    return serverErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await authenticateAdmin(req);
    const body = await req.json();
    const parsed = CreateCategorySchema.safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 422, parsed.error.flatten());

    const slug = generateSlug(parsed.data.name);
    const category = await prisma.productCategory.create({
      data: { ...parsed.data, slug },
    });
    return successResponse(category, 201);
  } catch (err) {
    if ((err as Error).message?.includes("Admin")) return errorResponse((err as Error).message, 403);
    return serverErrorResponse(err);
  }
}
