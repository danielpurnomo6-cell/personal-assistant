import { NextResponse } from 'next/server';
import { deleteNoteById } from '../../../lib/diary-store';

export async function DELETE(_req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID wajib diisi.' }, { status: 400 });
    await deleteNoteById(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal menghapus catatan.' }, { status: 500 });
  }
}
