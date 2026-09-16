import { NextResponse } from 'next/server';
import { updateTodoById, deleteTodoById } from '../../../lib/diary-store';

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID wajib diisi.' }, { status: 400 });
    const patch = await req.json();
    const todo = await updateTodoById(id, patch);
    return NextResponse.json({ todo });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal mengubah to-do.' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID wajib diisi.' }, { status: 400 });
    await deleteTodoById(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal menghapus to-do.' }, { status: 500 });
  }
}
