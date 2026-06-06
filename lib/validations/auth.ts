import { z } from "zod";

const GoogleIdTokenSchema = z
  .string()
  .min(1, "Google ID token is required")
  .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, "Google ID token must be a valid JWT");

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const GoogleAuthSchema = z
  .object({
    idToken: GoogleIdTokenSchema.optional(),
    token: GoogleIdTokenSchema.optional(),
    accessToken: z.string().min(1, "Google access token is required").optional(),
    access_token: z.string().min(1, "Google access token is required").optional(),
    nonce: z.string().min(1, "Nonce is required").optional(),
  })
  .refine((data) => data.idToken || data.token, {
    message: "Google ID token is required",
    path: ["idToken"],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>;
