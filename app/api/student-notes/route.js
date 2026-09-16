import { NextResponse } from 'next/server';
import {
  isValidDate,
  listStudentNotes,
  createStudentNote,
  countUnreadStudentNotes,
  storageMode,
} from '../../lib/diary-store';

// Rate-limit sederhana in-memory: max 10 kiriman / 10 menit / IP.
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 10;

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

// GET /api/student-notes?count=unread — jumlah belum dibaca (untuk badge).
// GET /api/student-notes?date=YYYY-MM-DD&unreadOnly=1&q=...&limit=... — inbox coach.
export async function GET(req) {
  try {
    const params = new URL(req.url).searchParams;
    if (params.get('count') === 'unread') {
      const unread = await countUnreadStudentNotes();
      return NextResponse.json({ unread, mode: storageMode() });
    }
    const date = params.get('date');
    if (date && !isValidDate(date)) {
      return NextResponse.json({ error: 'Param "date" harus format YYYY-MM-DD.' }, { status: 400 });
    }
    const notes = await listStudentNotes({
      date: date || null,
      unreadOnly: params.get('unreadOnly') === '1',
      q: params.get('q') || '',
      limit: Math.min(Math.max(parseInt(params.get('limit') || '200', 10) || 200, 1), 500),
    });
    return NextResponse.json({ notes, mode: storageMode() });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal memuat catatan murid.' }, { status: 500 });
  }
}

// POST /api/student-notes — form publik murid. Wajib kode kelas yang benar.
export async function POST(req) {
  try {
    const { name, class: studentClass, content, code } = await req.json();
    const expected = (process.env.STUDENT_CODE || '').trim();
    if (!expected) {
      return NextResponse.json(
        { error: 'Form murid belum aktif. Hubungi coach untuk kode kelas.' },
        { status: 503 }
      );
    }
    if ((code || '').trim() !== expected) {
      return NextResponse.json({ error: 'Kode kelas salah. Tanya kode ke coach ya.' }, { status: 403 });
    }
    if (isRateLimited(clientIp(req))) {
      return NextResponse.json(
        { error: 'Terlalu banyak kiriman. Coba lagi 10 menit lagi.' },
        { status: 429 }
      );
    }
    const note = await createStudentNote({ name, studentClass, content });
    return NextResponse.json({ ok: true, note: { id: note.id, date: note.date } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal mengirim catatan.' }, { status: 400 });
  }
}
