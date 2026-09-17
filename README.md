# Personal Assistant — AI + Catatan Murid

Aplikasi privat coach: chat AI (Gemini), catatan & to-do harian, kalender,
inbox catatan murid, dan dashboard murid. Dibangun dengan Next.js 16 (App Router).

## Rute

| Rute | Akses | Keterangan |
| --- | --- | --- |
| `/` | Terbuka (sementara) | Chat AI + widget harian |
| `/catatan` | Terbuka (sementara) | Inbox catatan murid + kelola murid & tugas |
| `/kalender` | Terbuka (sementara) | Kalender |
| `/tentang` | Terbuka (sementara) | Profil owner |
| `/isi-catatan` | Publik (murid) | Form kirim catatan (butuh kode kelas) |
| `/murid` | Publik (murid) | Dashboard murid (login nama + kode murid) |

> SEMENTARA: halaman login (`/login`) dan seluruh pengaman auth DINONAKTIFKAN
> atas permintaan owner (akan dibangun ulang). App terbuka tanpa login.

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

4. ~~Buat akun coach~~ (SEMENTARA dinonaktifkan — langsung jalan tanpa login):

```bash
npm run dev
```

Buka http://localhost:3000 — app langsung terbuka.

## Model AI

Default `gemini-3.6-flash` (override via `GEMINI_MODEL`). Fallback otomatis
yang teruji: `gemini-3.5-flash`, `gemini-3.5-flash-lite`. Jangan pakai model
2.x/1.5/2.5-flash — sudah tidak tersedia untuk key baru.

## Keamanan (ringkas)

> SEMENTARA DINONAKTIFKAN: `proxy.js` hanya pass-through, semua API terbuka
> tanpa login. Jangan share URL publik lebar-lebar sampai auth baru dibangun.
> Proteksi murid yang masih aktif: `STUDENT_CODE` (form), kode per murid
> (dashboard), dan rate-limit in-memory.

## Perintah

```bash
npm run dev    # development
npm run build  # production build
npm start      # jalankan hasil build
npm run lint   # eslint
```
