import { createBrowserClient } from '@supabase/ssr';

// Singleton Supabase untuk Client Component (login, logout).
// Butuh NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local.
let browserClient = null;

export function getSupabaseBrowser() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return browserClient;
}
