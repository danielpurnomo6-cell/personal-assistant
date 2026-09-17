-- Skema Supabase untuk fitur Catatan Harian + To-do + Dashboard Murid.
-- Model akses (JANGAN dilonggarkan tanpa membaca ini dulu):
-- - SEMUA akses tabel dari aplikasi lewat server (app/lib/diary-store.js ->
--   getSupabaseServer() dengan SUPABASE_SERVICE_ROLE_KEY). Service role BYPASS RLS,
--   jadi policy ketat di bawah TIDAK mengganggu aplikasi, termasuk endpoint
--   publik murid (proteksinya di layer API: STUDENT_CODE / kode murid + login).
-- - ANON KEY hanya untuk Supabase Auth (login coach). Ia TIDAK BOLEH bisa
--   baca/tulis tabel langsung via REST. Sebelumnya policy "public all ... using(true)"
--   membuka semua tabel untuk anon — itu lubang keamanan, sudah diganti di bawah.
-- Jalankan di Supabase Dashboard > SQL Editor > New query > Run.

create table if not exists notes (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  content text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists notes_date_idx on notes(date);
create unique index if not exists notes_date_unique on notes(date);

create table if not exists todos (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  title text not null,
  done boolean not null default false,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_time text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists todos_date_idx on todos(date);

-- RLS: hanya coach yang login (role authenticated) boleh akses langsung.
-- ANON (tanpa login) DITOLAK untuk semua tabel. Service role bypass RLS
-- sehingga seluruh operasional server (termasuk endpoint publik murid yang
-- sudah diamankan di layer API) tetap jalan normal.
alter table notes enable row level security;
alter table todos enable row level security;

drop policy if exists "public all notes" on notes;
drop policy if exists "coach all notes" on notes;
create policy "coach all notes" on notes
  for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "public all todos" on todos;
drop policy if exists "coach all todos" on todos;
create policy "coach all todos" on todos
  for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Catatan murid (form publik /isi-catatan). Proteksi utama ada di API
-- (kode kelas), policy hanya untuk coach login.
create table if not exists student_notes (
  id uuid default gen_random_uuid() primary key,
  date date not null default CURRENT_DATE,
  name text not null,
  class text not null,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists student_notes_date_idx on student_notes(date);
create index if not exists student_notes_unread_idx on student_notes(is_read) where is_read = false;

-- Catatan murid (form publik /isi-catatan). Proteksi utama ada di API
-- (kode kelas). Akses tabel langsung tetap hanya untuk coach login;
-- server (service role) yang menulis data kiriman murid setelah kode valid.
alter table student_notes enable row level security;

drop policy if exists "public all student_notes" on student_notes;
drop policy if exists "coach all student_notes" on student_notes;
create policy "coach all student_notes" on student_notes
  for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Dashboard murid (/murid): murid login pakai kode unik per murid,
-- melihat jadwal coach + tugas konten + to-do mereka, bisa update progres.
-- Proteksi utama ada di API (cek kode tiap request), policy hanya untuk coach login.
create table if not exists students (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  class text not null default '',
  code text not null unique,
  created_at timestamptz default now()
);
create index if not exists students_code_idx on students(code);

create table if not exists student_tasks (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references students(id) on delete cascade,
  kind text not null default 'todo' check (kind in ('jadwal', 'konten', 'todo')),
  title text not null,
  detail text not null default '',
  date date not null default CURRENT_DATE,
  done boolean not null default false,
  done_at timestamptz null,
  progress text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists student_tasks_student_idx on student_tasks(student_id);
create index if not exists student_tasks_date_idx on student_tasks(date);

-- Dashboard murid (/murid): murid login pakai kode unik per murid,
-- melihat jadwal coach + tugas konten + to-do mereka, bisa update progres.
-- Proteksi utama ada di API (cek kode tiap request). Akses tabel langsung
-- tetap hanya untuk coach login; server (service role) yang melayani
-- request murid setelah kode terverifikasi.
alter table students enable row level security;
alter table student_tasks enable row level security;

drop policy if exists "public all students" on students;
drop policy if exists "coach all students" on students;
create policy "coach all students" on students
  for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "public all student_tasks" on student_tasks;
drop policy if exists "coach all student_tasks" on student_tasks;
create policy "coach all student_tasks" on student_tasks
  for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
