import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export const supabase = createClient(
  requireEnv(supabaseUrl, "SUPABASE_URL"),
  requireEnv(supabaseAnonKey, "SUPABASE_ANON_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: WebSocket as any,
    },
  }
);

export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return null;
  }

  return createClient(requireEnv(supabaseUrl, "SUPABASE_URL"), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: WebSocket as any,
    },
  });
}
