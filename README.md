# Personal Assistant — AI + Catatan Murid

Aplikasi privat coach: chat AI (Gemini), catatan & to-do harian, kalender,
inbox catatan murid, dan dashboard murid. Dibangun dengan Next.js 16 (App Router).

## Rute

| Rute | Akses | Keterangan |
| --- | --- | --- |
| `/` | Coach (login) | Chat AI + widget harian |
| `/login` | Publik | Login coach (Supabase Auth email+password) |
| `/catatan` | Coach | Inbox catatan murid + kelola murid & tugas |
| `/kalender` | Coach | Kalender |
| `/tentang` | Coach | Profil owner |
| `/isi-catatan` | Publik (murid) | Form kirim catatan (butuh kode kelas) |
| `/murid` | Publik (murid) | Dashboard murid (login nama + kode murid) |

## Setup

1. Install dan salin env:

```bash
npm install
cp .env.example .env.local
```

2. Isi `.env.local` (lihat `.env.example` untuk panduan tiap key):

- `GEMINI_API_KEY` — dari AI Studio (aistudio.google.com). Wajib untuk chat.
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — dari Supabase Dashboard >
  Project Settings > API. **Service role wajib**: data layer server memakainya
  dan RLS menolak anon key.
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — untuk login
  (Supabase Auth). URL boleh sama dengan `SUPABASE_URL`.
- `STUDENT_CODE` — kode rahasia form murid, bagikan via grup WA.
  Contoh: `STUDENT_CODE=KELAS-DANIEL-2026`

3. Siapkan database — jalankan seluruh isi `supabase-schema.sql` di
Supabase Dashboard > SQL Editor > New query > Run. File ini idempoten
(boleh dijalankan ulang). RLS dikunci: hanya `authenticated` yang bisa
akses tabel langsung; anon ditolak; service role bypass untuk server.

4. Buat akun coach — Supabase Dashboard > Authentication > Users > Add user
(email + password), lalu:

```bash
npm run dev
```

Buka http://localhost:3000/login dan masuk dengan akun tersebut.

## Model AI

Default `gemini-3.6-flash` (override via `GEMINI_MODEL`). Fallback otomatis
yang teruji: `gemini-3.5-flash`, `gemini-3.5-flash-lite`. Jangan pakai model
2.x/1.5/2.5-flash — sudah tidak tersedia untuk key baru.

## Keamanan (ringkas)

- Proxy (`proxy.js`): semua halaman privat redirect ke `/login` jika belum
  login; API privat balas 401 JSON. Publik hanya `/login`, `/isi-catatan`,
  `/murid`, dan 3 endpoint murid (`POST /api/student-notes`,
  `GET /api/student-tasks` tanpa `manage`, `PATCH /api/student-tasks/:id`
  berkode).
- Route coach (`manage=1`, `POST` tugas, `PATCH/DELETE`) wajib Supabase session
  via `getSessionUser()` — lapis kedua di balik proxy.
- Proteksi murid di layer API: `STUDENT_CODE` (form) dan kode per murid
  (dashboard). Rate-limit in-memory: 10 kiriman / 10 mnt / IP (catatan),
  30 / 10 mnt (tugas). Catatan: limit ini per-instance — untuk deployment
  multi-instance/serverless gunakan KV eksternal.

## Perintah

```bash
npm run dev    # development
npm run build  # production build
npm start      # jalankan hasil build
npm run lint   # eslint
```
