import { NextResponse } from 'next/server';
import { getOAuthClient, saveTokens, getAccountEmail } from '../../../lib/google';

// GET /api/google/callback?code=..&state=.. — terima code Google, tukar jadi token, simpan, kembali ke /kalender.
export async function GET(req) {
  const origin = req.nextUrl.origin;
  const done = (params) => {
    const res = NextResponse.redirect(`${origin}/kalender${params}`);
    res.cookies.set('g_oauth_state', '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
  };
  try {
    const params = req.nextUrl.searchParams;
    if (params.get('error')) {
      return done(`?google_error=${encodeURIComponent('Izin Google dibatalkan. Coba lagi dan klik Izinkan.')}`);
    }
    const code = params.get('code');
    const state = params.get('state');
    const expected = req.cookies.get('g_oauth_state')?.value;
    if (!code || !state || !expected || state !== expected) {
      return done(`?google_error=${encodeURIComponent('Sesi koneksi tidak valid/kedaluwarsa. Klik "Hubungkan Google" lagi.')}`);
    }
    const oauth = getOAuthClient(origin);
    const { tokens } = await oauth.getToken(code);
    oauth.setCredentials(tokens);
    const email = await getAccountEmail(oauth);
    await saveTokens({ ...tokens, email });
    return done('?connected=1');
  } catch (e) {
    return done(`?google_error=${encodeURIComponent(e?.message || 'Gagal menghubungkan Google Calendar.')}`);
  }
}
