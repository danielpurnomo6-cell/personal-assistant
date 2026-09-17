import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/supabase/server';
import { markStudentNoteRead, deleteStudentNoteById } from '../../../lib/diary-store';

// COACH ONLY: PATCH & DELETE wajib login via Supabase Auth.
async function requireCoach() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized. Silakan login dulu.' },
      { status: 401 }
    );
  }
  return null;
}

export async function PATCH(req, { params }) {
  try {
    const unauthorized = await requireCoach();
    if (unauthorized) return unauthorized;
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
    const unauthorized = await requireCoach();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    await deleteStudentNoteById(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal menghapus.' }, { status: 400 });
  }
}
