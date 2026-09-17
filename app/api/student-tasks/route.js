import { NextResponse } from 'next/server';
import { getSessionUser } from '../../lib/supabase/server';
import {
  getStudentByCode,
  listStudents,
  listStudentTasks,
  upsertStudent,
  createStudentTask,
  storageMode,
} from '../../lib/diary-store';

// Rate-limit sederhana in-memory untuk endpoint murid.
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 30;

function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_HITS) return true;
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

// GET /api/student-tasks?name=..&code=.. — dashboard murid (wajib kode benar).
// GET /api/student-tasks?manage=1 — daftar semua murid + tugas (halaman coach).
export async function GET(req) {
  try {
    const params = new URL(req.url).searchParams;
    if (params.get('manage') === '1') {
      // COACH ONLY: daftar semua murid + tugas.
      const user = await getSessionUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized. Silakan login dulu.' },
          { status: 401 }
        );
      }
      const students = await listStudents();
      const tasks = await listStudentTasks({});
      return NextResponse.json({ students, tasks, mode: storageMode() });
    }
    if (isRateLimited(clientIp(req))) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi 10 menit lagi.' }, { status: 429 });
    }
    const student = await getStudentByCode({
      name: params.get('name') || '',
      code: params.get('code') || '',
    });
    const tasks = await listStudentTasks({ studentId: student.id });
    return NextResponse.json(
      {
        student: { id: student.id, name: student.name, class: student.class },
        tasks,
        mode: storageMode(),
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal memuat data murid.' }, { status: 400 });
  }
}

// POST /api/student-tasks — COACH ONLY (wajib login): menambah murid + tugas.
export async function POST(req) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Silakan login dulu.' },
        { status: 401 }
      );
    }
    const { name, class: studentClass, code, kind, title, detail, date } = await req.json();
    const student = await upsertStudent({ name, studentClass, code });
    const task = await createStudentTask({ studentId: student.id, kind, title, detail, date });
    return NextResponse.json({ student, task, mode: storageMode() });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal menambah tugas murid.' }, { status: 400 });
  }
}
