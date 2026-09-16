-- Skema Supabase untuk fitur Catatan Harian + To-do (single-user, tanpa auth).
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

-- Buka akses baca/tulis untuk anon key (personal use 1 orang).
-- Kalau nanti butuh auth, hapus policy ini dan ganti dengan auth.uid().
alter table notes enable row level security;
alter table todos enable row level security;

drop policy if exists "public all notes" on notes;
create policy "public all notes" on notes for all using (true) with check (true);

drop policy if exists "public all todos" on todos;
create policy "public all todos" on todos for all using (true) with check (true);

-- Catatan murid (form publik /isi-catatan). Proteksi utama ada di API
-- (kode kelas), jadi policy mengikuti pola tabel lain.
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

alter table student_notes enable row level security;

drop policy if exists "public all student_notes" on student_notes;
create policy "public all student_notes" on student_notes for all using (true) with check (true);
