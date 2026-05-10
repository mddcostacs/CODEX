import { createClient } from "@supabase/supabase-js";

function isHttpUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function createRequestSupabase(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isHttpUrl(supabaseUrl) || !supabaseAnonKey) {
    throw new Error("Supabase não configurado no servidor.");
  }

  const validSupabaseUrl = supabaseUrl;
  const validSupabaseAnonKey = supabaseAnonKey;
  const authorization = request.headers.get("authorization") ?? "";
  return createClient(validSupabaseUrl, validSupabaseAnonKey, {
    global: authorization ? { headers: { Authorization: authorization } } : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
