import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Pengganti middleware.js di Next 16 (middleware deprecated -> proxy).
// - Refresh session Supabase di setiap request (wajib agar cookie auth hidup).
// - Redirect yang belum login ke /login untuk halaman privat.
// - Yang sudah login dan buka /login diarahkan ke /.
// - Tetap publik: /login, /isi-catatan (form murid), /murid (dashboard murid
//   dengan auth nama+kode sendiri), API murid, file statis.
//   /tentang SENGAJA tetap privat (profil owner, tertaut dari halaman privat).
// Endpoint murid yang BOLEH diakses tanpa Supabase session.
// - POST /api/student-notes — form publik murid (diamankan STUDENT_CODE di route).
// - GET /api/student-notes — TIDAK publik (inbox coach).
// - GET /api/student-tasks?name&code (tanpa manage) — dashboard murid
//   (diamankan kode murid di route). Varian ?manage=1 milik coach.
// - PATCH /api/student-tasks/:id — dilewatkan agar murid bisa update miliknya;
//   route membedakan: ada body.code = murid (verifikasi), tanpa code = coach (wajib login).
// - Selain itu (POST /api/student-tasks, DELETE, PATCH/DELETE student-notes) wajib login.
function isPublicStudentApi(request, pathname) {
  const method = request.method.toUpperCase();
  if (pathname === '/api/student-notes' && method === 'POST') return true;
  if (pathname === '/api/student-tasks' && method === 'GET') {
    return request.nextUrl.searchParams.get('manage') !== '1';
  }
  if (pathname.startsWith('/api/student-tasks/') && method === 'PATCH') return true;
  return false;
}

export async function proxy(request) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  let user = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);
  try {
    if (!isAuthConfigured) {
      // Env auth belum lengkap: anggap belum login (aman = terkunci).
      // Lihat .env.example -> NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.
      user = null;
    } else {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    }
  } catch {
    // Env belum lengkap / Supabase tak terjangkau: anggap belum login (aman = terkunci).
    user = null;
  }

  if (!user && pathname !== '/login') {
    // API murid yang publik (form + dashboard murid): teruskan tanpa session.
    if (isPublicStudentApi(request, pathname)) return response;
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
    // Semua path kecuali: file statis Next, favicon,
    // halaman form murid /isi-catatan dan dashboard murid /murid
    // (keduanya punya auth sendiri: kode kelas / nama+kode, tetap bisa dibuka tanpa login).
    // API student-notes/student-tasks SENGAJA masuk matcher agar proxy bisa
    // membedakan endpoint publik murid vs endpoint coach (lihat isPublicStudentApi).
    // Catatan: /login ikut masuk matcher agar redirect balik (sudah login -> /) jalan.
    // /tentang tetap masuk matcher (= privat, butuh login).
    '/((?!_next/static|_next/image|favicon.ico|isi-catatan|murid).*)',
  ],
};
