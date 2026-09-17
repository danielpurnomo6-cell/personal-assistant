import { NextResponse } from 'next/server';

// SEMENTARA: pengaman login DINONAKTIFKAN atas permintaan owner.
// Semua request diteruskan tanpa cek session. Auth baru akan dibangun ulang.
// Jangan share URL publik lebar-lebar selama mode terbuka ini aktif.
export async function proxy(request) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    // SEMENTARA: matcher dipertahankan agar proxy tetap aktif sebagai
    // pass-through (memudahkan mengembalikan guard saat auth baru dibangun).
    '/((?!_next/static|_next/image|favicon.ico|isi-catatan|murid).*)',
  ],
};
