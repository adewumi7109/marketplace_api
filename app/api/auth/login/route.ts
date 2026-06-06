import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { LoginSchema } from "@/lib/validations/auth";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { email, password } = parsed.data;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user?.email || !data.session) {
      return errorResponse("Invalid credentials", 401);
    }

    const name =
      typeof data.user.user_metadata?.name === "string"
        ? data.user.user_metadata.name
        : data.user.email.split("@")[0];

    const existingUser = await prisma.user.findUnique({ where: { email: data.user.email } });
    const user =
      existingUser ??
      (await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email,
          name,
        },
      }));

    return successResponse({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: data.session.access_token,
      session: data.session,
    });
  } catch (err) {
    console.error("[AUTH/LOGIN]", err);
    return serverErrorResponse(err);
  }
}
