import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateAdmin } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateTemplateSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).regex(/^[a-z0-9_]+$/, "Code must be lowercase alphanumeric with underscores"),
  type: z.enum(["STORE", "CHURCH", "TEAM", "PORTFOLIO", "RESTAURANT"]).default("STORE"),
  description: z.string().optional(),
  previewUrl: z.string().url().optional(),
  config: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
});

// GET /api/templates — public
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const templates = await prisma.template.findMany({
      where: {
        isActive: true,
        ...(type ? { type: type as any } : {}),
      },
      include: { _count: { select: { stores: true } } },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(templates);
  } catch (err) {
    console.error("[TEMPLATES/GET]", err);
    return serverErrorResponse(err);
  }
}

// POST /api/templates — admin only
export async function POST(req: NextRequest) {
  try {
    await authenticateAdmin(req);
    const body = await req.json();
    const parsed = CreateTemplateSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 422, parsed.error.flatten());

    const data: Prisma.TemplateCreateInput = {
      ...parsed.data,
      config: parsed.data.config as Prisma.InputJsonValue,
    };

    const template = await prisma.template.create({ data });
    return successResponse(template, 201);
  } catch (err) {
    console.error("[TEMPLATES/POST]", err);
    if ((err as Error).message?.includes("Admin")) return errorResponse((err as Error).message, 403);
    if ((err as any)?.code === "P2002") return errorResponse("Template code already exists", 409);
    return serverErrorResponse(err);
  }
}
