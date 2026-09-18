import { NextResponse } from 'next/server';
import { getAuthedClient, clearTokens } from '../../../lib/google';

// POST /api/google/disconnect — revoke token di Google lalu hapus simpanan lokal.
export async function POST(req) {
  try {
    try {
      const oauth = await getAuthedClient(req.nextUrl.origin);
      const creds = oauth.credentials;
      if (creds?.access_token || creds?.refresh_token) {
        await oauth.revokeCredentials().catch(() => {});
      }
    } catch {
      // belum connect / token basi — tetap bersihkan simpanan
    }
    await clearTokens();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal memutus koneksi.' }, { status: 500 });
  }
}
