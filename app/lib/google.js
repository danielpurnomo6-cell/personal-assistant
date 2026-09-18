import fs from 'node:fs/promises';
import path from 'node:path';
import { google } from 'googleapis';
import { getSupabaseServer, isSupabaseConfigured } from './supabase';

// Integrasi Google Calendar pribadi coach via OAuth 2.0.
// - Client ID/Secret dari Google Cloud Console (lihat .env.example).
// - Token (access + refresh) disimpan sisi SERVER saja, tidak pernah ke browser.
//   Penyimpanan ikut pola diary-store: tabel Supabase `app_settings` jika ada,
//   fallback file ./data/google-tokens.json.
// - Redirect URI diturunkan dari origin request, jadi localhost & Vercel
//   otomatis benar (keduanya wajib didaftarkan di Google Cloud Console).

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

const TOKEN_KEY = 'google_tokens';
const TOKEN_FILE = path.join(process.cwd(), 'data', 'google-tokens.json');

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getOAuthClient(origin) {
  if (!isGoogleConfigured()) {
    throw new Error('Google Calendar belum dikonfigurasi. Isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di .env.local.');
  }
  const cleanOrigin = (origin || '').replace(/\/$/, '');
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${cleanOrigin}/api/google/callback`
  );
}

export function getConsentUrl(oauth, state) {
  return oauth.generateAuthUrl({
    access_type: 'offline', // wajib agar dapat refresh_token
    prompt: 'consent', // pastikan refresh_token dikirim tiap connect ulang
    scope: GOOGLE_SCOPES,
    state,
  });
}

async function readTokenFile() {
  try {
    const raw = await fs.readFile(TOKEN_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeTokenFile(tokens) {
  await fs.mkdir(path.dirname(TOKEN_FILE), { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf8');
}

export async function getStoredTokens() {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { data, error } = await sb.from('app_settings').select('value').eq('key', TOKEN_KEY).limit(1);
    if (error) throw new Error(error.message);
    return (data && data[0] && data[0].value) || null;
  }
  return readTokenFile();
}

export async function saveTokens(tokens) {
  if (!tokens || typeof tokens !== 'object') throw new Error('Token tidak valid.');
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { error } = await sb
      .from('app_settings')
      .upsert({ key: TOKEN_KEY, value: tokens, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    return;
  }
  await writeTokenFile(tokens);
}

export async function clearTokens() {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { error } = await sb.from('app_settings').delete().eq('key', TOKEN_KEY);
    if (error) throw new Error(error.message);
    return;
  }
  try {
    await fs.unlink(TOKEN_FILE);
  } catch {
    // belum pernah connect — abaikan
  }
}

// OAuth client yang sudah diautentikasi (auto-refresh access token bila kedaluwarsa).
// Melempar error bila belum connect — route API menerjemahkannya ke 409 + { needsConnect: true }.
export async function getAuthedClient(origin) {
  const oauth = getOAuthClient(origin);
  const stored = await getStoredTokens();
  if (!stored || !stored.refresh_token) {
    const err = new Error('Google Calendar belum terhubung. Klik "Hubungkan Google" dulu.');
    err.needsConnect = true;
    throw err;
  }
  oauth.setCredentials(stored);
  // Simpan token hasil refresh otomatis agar refresh_token tidak basi.
  oauth.on('tokens', (t) => {
    saveTokens({ ...stored, ...t }).catch(() => {});
  });
  return oauth;
}

export function getCalendarApi(oauth) {
  return google.calendar({ version: 'v3', auth: oauth });
}

export async function getAccountEmail(oauth) {
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth });
    const { data } = await oauth2.userinfo.get();
    return data?.email || null;
  } catch {
    return null;
  }
}
