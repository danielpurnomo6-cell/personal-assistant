import { createClient } from '@supabase/supabase-js';

let cached = null;

export function isSupabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  );
}

export function getSupabaseServer() {
  if (!isSupabaseConfigured()) return null;
  if (cached) return cached;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  cached = createClient(process.env.SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
  return cached;
}
