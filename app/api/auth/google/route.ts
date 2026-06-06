import { successResponse, errorResponse, serverErrorResponse } from "@/utils/response";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { GoogleAuthSchema } from "@/lib/validations/auth";
// POST /api/auth/google - continue with Google
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = GoogleAuthSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { idToken, token, accessToken, access_token, nonce } = parsed.data;

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken ?? token ?? "",
      access_token: accessToken ?? access_token,
      nonce,
    });

    if (error || !data.user?.email || !data.session) {
      return errorResponse(error?.message ?? "Invalid Google credentials", 401);
    }

    const metadata = data.user.user_metadata ?? {};
    const metadataName =
      typeof metadata.name === "string"
        ? metadata.name
        : typeof metadata.full_name === "string"
          ? metadata.full_name
          : null;
    const name = metadataName ?? data.user.email.split("@")[0];

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: data.user.id }, { email: data.user.email }],
      },
    });

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
    console.error("[AUTH/GOOGLE]", err);
    return serverErrorResponse(err);
  }
}
