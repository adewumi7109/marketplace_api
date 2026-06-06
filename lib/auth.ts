import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { supabase } from "./supabase";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export async function authenticate(req: NextRequest): Promise<AuthPayload> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    throw new Error("Invalid or expired authorization token");
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: data.user.id },
        { email: data.user.email },
      ],
    },
  });
  if (!user) throw new Error("User not found");

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}

export async function authenticateAdmin(req: NextRequest): Promise<AuthPayload> {
  const payload = await authenticate(req);
  if (payload.role !== "ADMIN") {
    throw new Error("Admin access required");
  }
  return payload;
}
