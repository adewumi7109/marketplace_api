import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { RegisterSchema } from "@/lib/validations/auth";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("Email already in use", 409);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      return errorResponse(error.message, 400);
    }

    if (!data.user) {
      return errorResponse("Unable to create Supabase user", 500);
    }

    const user = await prisma.user.create({
      data: { id: data.user.id, name, email },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return successResponse(
      {
        user,
        token: data.session?.access_token ?? null,
        session: data.session,
      },
      201
    );
  } catch (err) {
    console.error("[AUTH/REGISTER]", err);
    return serverErrorResponse(err);
  }
}
