import { NextResponse } from 'next/server';
import { markStudentNoteRead, deleteStudentNoteById } from '../../../lib/diary-store';

// SEMENTARA: tanpa cek login (auth akan dibangun ulang).
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    let isRead = true;
    try {
      const body = await req.json();
      if (typeof body.is_read === 'boolean') isRead = body.is_read;
      else if (typeof body.isRead === 'boolean') isRead = body.isRead;
    } catch {
      // body kosong → default tandai dibaca
    }
    const note = await markStudentNoteRead(id, isRead);
    return NextResponse.json({ note });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal mengubah status.' }, { status: 400 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id } = await params;
    await deleteStudentNoteById(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal menghapus.' }, { status: 400 });
  }
}
