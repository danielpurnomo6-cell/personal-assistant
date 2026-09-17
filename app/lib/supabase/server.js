import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Supabase terikat session user untuk Server Component / Route Handler.
// WAJIB await: di Next 16, cookies() asynchronous.
export function isSupabaseAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function getSupabaseServerClient() {
  if (!isSupabaseAuthConfigured()) {
    throw new Error(
      'Supabase auth belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local.'
    );
  }
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Dipanggil dari Server Component: pengatur cookie diabaikan,
            // refresh session ditangani oleh proxy.js.
          }
        },
      },
    }
  );
}

// Helper: ambil user yang login, atau null.
export async function getSessionUser() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}
