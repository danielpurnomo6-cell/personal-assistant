import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getOAuthClient, getConsentUrl, isGoogleConfigured } from '../../../lib/google';

// GET /api/google/auth — mulai OAuth: set cookie state anti-CSRF lalu redirect ke consent Google.
export async function GET(req) {
  try {
    if (!isGoogleConfigured()) {
      return NextResponse.json(
        { error: 'Google Calendar belum dikonfigurasi. Isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di .env.local.' },
        { status: 500 }
      );
    }
    const state = crypto.randomBytes(16).toString('hex');
    const oauth = getOAuthClient(req.nextUrl.origin);
    const url = getConsentUrl(oauth, state);
    const res = NextResponse.redirect(url);
    res.cookies.set('g_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 menit
      secure: req.nextUrl.protocol === 'https:',
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal memulai koneksi Google.' }, { status: 500 });
  }
}
