import fs from 'node:fs/promises';
import path from 'node:path';
import { getSupabaseServer, isSupabaseConfigured } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const TODOS_FILE = path.join(DATA_DIR, 'todos.json');
const STUDENT_NOTES_FILE = path.join(DATA_DIR, 'student-notes.json');

// Batas input form murid (disamakan dengan validasi API).
export const STUDENT_LIMITS = { name: 50, studentClass: 50, content: 2000 };

export function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (y < 1970 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidMonth(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}$/.test(s)) return false;
  const [y, m] = s.split('-').map(Number);
  return y >= 1970 && y <= 2100 && m >= 1 && m <= 12;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await ensureDataDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

function nowIso() {
  return new Date().toISOString();
}

// ---------- NOTES ----------

export async function listNotesByDate(date) {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from('notes')
      .select('*')
      .eq('date', date)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }
  const all = await readJson(NOTES_FILE, []);
  return all.filter((n) => n.date === date).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
}

export async function upsertNoteByDate(date, content) {
  const text = (content || '').trim();
  if (!text) throw new Error('Isi catatan tidak boleh kosong.');
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { data: existing } = await sb.from('notes').select('id').eq('date', date).limit(1);
    if (existing && existing.length > 0) {
      const { data, error } = await sb
        .from('notes')
        .update({ content: text, updated_at: nowIso() })
        .eq('date', date)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    const { data, error } = await sb.from('notes').insert({ date, content: text }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const all = await readJson(NOTES_FILE, []);
  const idx = all.findIndex((n) => n.date === date);
  if (idx >= 0) {
    all[idx] = { ...all[idx], content: text, updated_at: nowIso() };
  } else {
    all.push({ id: makeId(), date, content: text, created_at: nowIso(), updated_at: nowIso() });
  }
  await writeJson(NOTES_FILE, all);
  return all.find((n) => n.date === date);
}

export async function deleteNoteById(id) {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { error } = await sb.from('notes').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  const all = await readJson(NOTES_FILE, []);
  await writeJson(NOTES_FILE, all.filter((n) => n.id !== id));
  return true;
}

// ---------- TODOS ----------

export async function listTodosByDate(date) {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from('todos')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }
  const all = await readJson(TODOS_FILE, []);
  return all.filter((t) => t.date === date).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
}

export async function createTodo({ date, title, priority }) {
  const t = (title || '').trim();
  if (!t) throw new Error('Judul to-do tidak boleh kosong.');
  const p = ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from('todos')
      .insert({ date, title: t.slice(0, 200), priority: p })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  const all = await readJson(TODOS_FILE, []);
  const row = {
    id: makeId(),
    date,
    title: t.slice(0, 200),
    done: false,
    priority: p,
    due_time: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  all.push(row);
  await writeJson(TODOS_FILE, all);
  return row;
}

export async function updateTodoById(id, patch) {
  const allowed = {};
  if (typeof patch.done === 'boolean') allowed.done = patch.done;
  if (typeof patch.title === 'string' && patch.title.trim()) allowed.title = patch.title.trim().slice(0, 200);
  if (['low', 'medium', 'high'].includes(patch.priority)) allowed.priority = patch.priority;
  if (patch.due_time === null || typeof patch.due_time === 'string') allowed.due_time = patch.due_time;
  if (Object.keys(allowed).length === 0) throw new Error('Tidak ada field valid untuk diubah.');
  allowed.updated_at = nowIso();

  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { data, error } = await sb.from('todos').update(allowed).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const all = await readJson(TODOS_FILE, []);
  const idx = all.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error('To-do tidak ditemukan.');
  all[idx] = { ...all[idx], ...allowed };
  await writeJson(TODOS_FILE, all);
  return all[idx];
}

export async function deleteTodoById(id) {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { error } = await sb.from('todos').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  const all = await readJson(TODOS_FILE, []);
  await writeJson(TODOS_FILE, all.filter((t) => t.id !== id));
  return true;
}

// ---------- CATATAN MURID ----------

export function todayLocalDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function normalizeStudentInput({ name, studentClass, content }) {
  const n = (name || '').trim().slice(0, STUDENT_LIMITS.name);
  const c = (studentClass || '').trim().slice(0, STUDENT_LIMITS.studentClass);
  const t = (content || '').trim().slice(0, STUDENT_LIMITS.content);
  if (!n) throw new Error('Nama wajib diisi.');
  if (!c) throw new Error('Kelas wajib diisi.');
  if (!t) throw new Error('Isi catatan tidak boleh kosong.');
  return { name: n, studentClass: c, content: t };
}

export async function createStudentNote({ name, studentClass, content, date }) {
  const clean = normalizeStudentInput({ name, studentClass, content });
  const day = isValidDate(date) ? date : todayLocalDate();
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from('student_notes')
      .insert({ date: day, name: clean.name, class: clean.studentClass, content: clean.content })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  const all = await readJson(STUDENT_NOTES_FILE, []);
  const row = {
    id: makeId(),
    date: day,
    name: clean.name,
    class: clean.studentClass,
    content: clean.content,
    is_read: false,
    created_at: nowIso(),
  };
  all.push(row);
  await writeJson(STUDENT_NOTES_FILE, all);
  return row;
}

export async function listStudentNotes({ date = null, unreadOnly = false, q = '', limit = 200 } = {}) {
  const query = (q || '').trim().toLowerCase();
  const matches = (r) => {
    if (date && r.date !== date) return false;
    if (unreadOnly && r.is_read) return false;
    if (query && !`${r.name || ''} ${r.class || ''} ${r.content || ''}`.toLowerCase().includes(query)) return false;
    return true;
  };
  const sortDesc = (a, b) => (b.created_at || '').localeCompare(a.created_at || '');
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    let req = sb.from('student_notes').select('*').order('created_at', { ascending: false }).limit(limit);
    if (date) req = req.eq('date', date);
    if (unreadOnly) req = req.eq('is_read', false);
    const { data, error } = await req;
    if (error) throw new Error(error.message);
    const rows = data || [];
    return query ? rows.filter(matches).slice(0, limit) : rows;
  }
  const all = await readJson(STUDENT_NOTES_FILE, []);
  return all.filter(matches).sort(sortDesc).slice(0, limit);
}

export async function countUnreadStudentNotes() {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { count, error } = await sb
      .from('student_notes')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);
    if (error) throw new Error(error.message);
    return count || 0;
  }
  const all = await readJson(STUDENT_NOTES_FILE, []);
  return all.filter((r) => !r.is_read).length;
}

export async function markStudentNoteRead(id, isRead = true) {
  if (!id) throw new Error('ID wajib diisi.');
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from('student_notes')
      .update({ is_read: Boolean(isRead) })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  const all = await readJson(STUDENT_NOTES_FILE, []);
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error('Catatan murid tidak ditemukan.');
  all[idx] = { ...all[idx], is_read: Boolean(isRead) };
  await writeJson(STUDENT_NOTES_FILE, all);
  return all[idx];
}

export async function deleteStudentNoteById(id) {
  if (!id) throw new Error('ID wajib diisi.');
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { error } = await sb.from('student_notes').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  const all = await readJson(STUDENT_NOTES_FILE, []);
  await writeJson(STUDENT_NOTES_FILE, all.filter((r) => r.id !== id));
  return true;
}

const STUDENT_TASKS_FILE = path.join(DATA_DIR, 'student-tasks.json');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');

// Batas input dashboard murid.
export const TASK_LIMITS = { name: 50, studentClass: 50, code: 20, title: 200, detail: 2000, progress: 1000 };
export const TASK_KINDS = [
  { id: 'jadwal', label: 'Jadwal' },
  { id: 'konten', label: 'Konten' },
  { id: 'todo', label: 'To-do' },
];

function normalizeTaskKind(kind) {
  return ['jadwal', 'konten', 'todo'].includes(kind) ? kind : 'todo';
}

function normalizeStudentCode(code) {
  const c = (code || '').trim().toUpperCase().slice(0, TASK_LIMITS.code);
  if (!c) throw new Error('Kode murid wajib diisi.');
  if (!/^[A-Z0-9-]{3,20}$/.test(c)) throw new Error('Kode murid hanya boleh huruf, angka, dan strip (3-20 karakter).');
  return c;
}

// ---------- DASHBOARD MURID ----------

export async function upsertStudent({ name, studentClass, code }) {
  const n = (name || '').trim().slice(0, TASK_LIMITS.name);
  const c = (studentClass || '').trim().slice(0, TASK_LIMITS.studentClass);
  const cd = normalizeStudentCode(code);
  if (!n) throw new Error('Nama murid wajib diisi.');
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { data: existing } = await sb.from('students').select('id').eq('code', cd).limit(1);
    if (existing && existing.length > 0) {
      const { data, error } = await sb
        .from('students')
        .update({ name: n, class: c })
        .eq('id', existing[0].id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    const { data, error } = await sb
      .from('students')
      .insert({ name: n, class: c, code: cd })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  const all = await readJson(STUDENTS_FILE, []);
  const idx = all.findIndex((s) => s.code === cd);
  if (idx >= 0) {
    all[idx] = { ...all[idx], name: n, class: c };
    await writeJson(STUDENTS_FILE, all);
    return all[idx];
  }
  const row = { id: makeId(), name: n, class: c, code: cd, created_at: nowIso() };
  all.push(row);
  await writeJson(STUDENTS_FILE, all);
  return row;
}

export async function listStudents() {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { data, error } = await sb.from('students').select('*').order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }
  const all = await readJson(STUDENTS_FILE, []);
  return all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

// Kembalikan murid HANYA jika kode cocok (dipakai tiap request halaman murid).
export async function getStudentByCode({ name, code }) {
  const cd = normalizeStudentCode(code);
  const n = (name || '').trim().toLowerCase();
  if (!n) throw new Error('Nama wajib diisi.');
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { data, error } = await sb.from('students').select('*').eq('code', cd).limit(1);
    if (error) throw new Error(error.message);
    const row = (data || [])[0];
    if (!row || (row.name || '').trim().toLowerCase() !== n) {
      throw new Error('Nama atau kode murid salah.');
    }
    return row;
  }
  const all = await readJson(STUDENTS_FILE, []);
  const row = all.find((s) => s.code === cd && (s.name || '').trim().toLowerCase() === n);
  if (!row) throw new Error('Nama atau kode murid salah.');
  return row;
}

export async function createStudentTask({ studentId, kind, title, detail, date }) {
  if (!studentId) throw new Error('Murid wajib dipilih.');
  const t = (title || '').trim().slice(0, TASK_LIMITS.title);
  if (!t) throw new Error('Judul tugas tidak boleh kosong.');
  const d = (detail || '').trim().slice(0, TASK_LIMITS.detail);
  const day = isValidDate(date) ? date : todayLocalDate();
  const k = normalizeTaskKind(kind);
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from('student_tasks')
      .insert({ student_id: studentId, kind: k, title: t, detail: d, date: day })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  const all = await readJson(STUDENT_TASKS_FILE, []);
  const row = {
    id: makeId(),
    student_id: studentId,
    kind: k,
    title: t,
    detail: d,
    date: day,
    done: false,
    done_at: null,
    progress: '',
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  all.push(row);
  await writeJson(STUDENT_TASKS_FILE, all);
  return row;
}

export async function listStudentTasks({ studentId = null, kind = null } = {}) {
  const k = kind ? normalizeTaskKind(kind) : null;
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    let req = sb.from('student_tasks').select('*').order('date', { ascending: true }).order('created_at', { ascending: true });
    if (studentId) req = req.eq('student_id', studentId);
    if (k) req = req.eq('kind', k);
    const { data, error } = await req;
    if (error) throw new Error(error.message);
    return data || [];
  }
  const all = await readJson(STUDENT_TASKS_FILE, []);
  return all
    .filter((t) => (!studentId || t.student_id === studentId) && (!k || t.kind === k))
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.created_at || '').localeCompare(b.created_at || ''));
}

export async function updateStudentTask(id, patch, { verifiedStudentId = null } = {}) {
  if (!id) throw new Error('ID wajib diisi.');
  const allowed = {};
  if (typeof patch.done === 'boolean') allowed.done = patch.done;
  if (typeof patch.progress === 'string') allowed.progress = patch.progress.trim().slice(0, TASK_LIMITS.progress);
  // Field coach saja (murid tidak boleh ubah judul/detail/tanggal).
  if (!verifiedStudentId) {
    if (typeof patch.title === 'string' && patch.title.trim()) allowed.title = patch.title.trim().slice(0, TASK_LIMITS.title);
    if (typeof patch.detail === 'string') allowed.detail = patch.detail.trim().slice(0, TASK_LIMITS.detail);
    if (patch.date && isValidDate(patch.date)) allowed.date = patch.date;
    if (patch.kind) allowed.kind = normalizeTaskKind(patch.kind);
  }
  if (Object.keys(allowed).length === 0) throw new Error('Tidak ada field valid untuk diubah.');
  if (typeof allowed.done === 'boolean') allowed.done_at = allowed.done ? nowIso() : null;
  allowed.updated_at = nowIso();

  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    let req = sb.from('student_tasks').update(allowed).eq('id', id);
    // Murid hanya boleh ubah tugas miliknya sendiri.
    if (verifiedStudentId) req = req.eq('student_id', verifiedStudentId);
    const { data, error } = await req.select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const all = await readJson(STUDENT_TASKS_FILE, []);
  const idx = all.findIndex((t) => t.id === id && (!verifiedStudentId || t.student_id === verifiedStudentId));
  if (idx < 0) throw new Error('Tugas tidak ditemukan.');
  all[idx] = { ...all[idx], ...allowed };
  await writeJson(STUDENT_TASKS_FILE, all);
  return all[idx];
}

export async function deleteStudentTaskById(id) {
  if (!id) throw new Error('ID wajib diisi.');
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { error } = await sb.from('student_tasks').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  const all = await readJson(STUDENT_TASKS_FILE, []);
  await writeJson(STUDENT_TASKS_FILE, all.filter((t) => t.id !== id));
  return true;
}

export async function deleteStudentById(id) {
  if (!id) throw new Error('ID wajib diisi.');
  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const { error } = await sb.from('students').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  const all = await readJson(STUDENTS_FILE, []);
  await writeJson(STUDENTS_FILE, all.filter((s) => s.id !== id));
  const tasks = await readJson(STUDENT_TASKS_FILE, []);
  await writeJson(STUDENT_TASKS_FILE, tasks.filter((t) => t.student_id !== id));
  return true;
}

// ---------- GABUNGAN ----------

export async function getDaily(date) {
  const [notes, todos, studentNotes] = await Promise.all([
    listNotesByDate(date),
    listTodosByDate(date),
    listStudentNotes({ date }).catch(() => []),
  ]);
  const done = todos.filter((t) => t.done).length;
  const studentUnread = studentNotes.filter((s) => !s.is_read).length;
  return {
    date,
    notes,
    todos,
    studentNotes,
    summary: {
      noteCount: notes.length,
      todoTotal: todos.length,
      todoDone: done,
      studentTotal: studentNotes.length,
      studentUnread,
    },
  };
}

export async function getMonthMap(month) {
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, '0')}`;

  if (isSupabaseConfigured()) {
    const sb = getSupabaseServer();
    const [
      { data: notes, error: notesError },
      { data: todos, error: todosError },
      { data: students, error: studentsError },
    ] = await Promise.all([
      sb.from('notes').select('date').gte('date', start).lte('date', end),
      sb.from('todos').select('date,done').gte('date', start).lte('date', end),
      sb.from('student_notes').select('date,is_read').gte('date', start).lte('date', end),
    ]);
    if (notesError) throw new Error(notesError.message);
    if (todosError) throw new Error(todosError.message);
    if (studentsError) throw new Error(studentsError.message);
    const map = {};
    const cell = (d) =>
      (map[d] = map[d] || { hasNote: false, todoTotal: 0, todoDone: 0, studentTotal: 0, studentUnread: 0 });
    (notes || []).forEach((n) => {
      cell(n.date).hasNote = true;
    });
    (todos || []).forEach((t) => {
      cell(t.date).todoTotal += 1;
      if (t.done) cell(t.date).todoDone += 1;
    });
    (students || []).forEach((s) => {
      cell(s.date).studentTotal += 1;
      if (!s.is_read) cell(s.date).studentUnread += 1;
    });
    return map;
  }
  const [allNotes, allTodos, allStudents] = await Promise.all([
    readJson(NOTES_FILE, []),
    readJson(TODOS_FILE, []),
    readJson(STUDENT_NOTES_FILE, []),
  ]);
  const map = {};
  const cell = (d) =>
    (map[d] = map[d] || { hasNote: false, todoTotal: 0, todoDone: 0, studentTotal: 0, studentUnread: 0 });
  allNotes.forEach((n) => {
    if (n.date >= start && n.date <= end) {
      cell(n.date).hasNote = true;
    }
  });
  allTodos.forEach((t) => {
    if (t.date >= start && t.date <= end) {
      cell(t.date).todoTotal += 1;
      if (t.done) cell(t.date).todoDone += 1;
    }
  });
  allStudents.forEach((s) => {
    if (s.date >= start && s.date <= end) {
      cell(s.date).studentTotal += 1;
      if (!s.is_read) cell(s.date).studentUnread += 1;
    }
  });
  return map;
}

export function storageMode() {
  return isSupabaseConfigured() ? 'supabase' : 'file';
}
