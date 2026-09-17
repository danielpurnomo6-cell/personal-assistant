import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Pengganti middleware.js di Next 16 (middleware deprecated -> proxy).
// - Refresh session Supabase di setiap request (wajib agar cookie auth hidup).
// - Redirect yang belum login ke /login untuk halaman privat.
// - Yang sudah login dan buka /login diarahkan ke /.
// - Tetap publik: /login, /isi-catatan (form murid), API murid, file statis.
export async function proxy(request) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  let user = null;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch {
    // Env belum lengkap / Supabase tak terjangkau: anggap belum login (aman = terkunci).
    user = null;
  }

  if (!user && pathname !== '/login') {
    // API: balas 401 JSON (jangan redirect, agar fetch client tidak dapat HTML).
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized. Silakan login dulu.' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Semua path kecuali: API murid (publik), file statis Next, favicon,
    // dan halaman form murid /isi-catatan (tetap bisa dibuka tanpa login).
    // Catatan: /login ikut masuk matcher agar redirect balik (sudah login -> /) jalan.
    '/((?!_next/static|_next/image|favicon.ico|isi-catatan|api/student-notes|api/student-tasks).*)',
  ],
};
