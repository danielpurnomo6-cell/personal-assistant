import { NextResponse } from 'next/server';
import { isValidDate, listNotesByDate, upsertNoteByDate, storageMode } from '../../lib/diary-store';

export async function GET(req) {
  try {
    const date = new URL(req.url).searchParams.get('date');
    if (!isValidDate(date)) {
      return NextResponse.json({ error: 'Param "date" harus format YYYY-MM-DD.' }, { status: 400 });
    }
    const notes = await listNotesByDate(date);
    return NextResponse.json({ date, notes, mode: storageMode() });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal memuat catatan.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { date, content } = await req.json();
    if (!isValidDate(date)) {
      return NextResponse.json({ error: 'Field "date" harus format YYYY-MM-DD.' }, { status: 400 });
    }
    const note = await upsertNoteByDate(date, content);
    return NextResponse.json({ note, mode: storageMode() });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal menyimpan catatan.' }, { status: 500 });
  }
}
