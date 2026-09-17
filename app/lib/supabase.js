import { createClient } from '@supabase/supabase-js';

let cached = null;

export function isSupabaseConfigured() {
  // Data layer: terima SUPABASE_* (server) atau NEXT_PUBLIC_* (fallback),
  // agar tidak klaim "supabase" padahal auth (NEXT_PUBLIC_*) belum diisi.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export function getSupabaseServer() {
  if (!isSupabaseConfigured()) return null;
  if (cached) return cached;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cached;
}
