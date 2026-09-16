import { NextResponse } from 'next/server';
import {
  getStudentByCode,
  updateStudentTask,
  deleteStudentTaskById,
  deleteStudentById,
} from '../../../lib/diary-store';

// PATCH /api/student-tasks/:id
// - Murid: { name, code, done, progress } — kode diverifikasi, hanya boleh ubah done/progress miliknya.
// - Coach: { done, title, detail, date, kind } tanpa kode — boleh ubah semua field.
// DELETE /api/student-tasks/:id — coach hapus tugas.
// DELETE /api/student-tasks/:id?student=1 — coach hapus murid + semua tugasnya.
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.code) {
      const student = await getStudentByCode({ name: body.name || '', code: body.code });
      const task = await updateStudentTask(
        id,
        { done: body.done, progress: body.progress },
        { verifiedStudentId: student.id }
      );
      return NextResponse.json({ task });
    }
    const task = await updateStudentTask(id, body);
    return NextResponse.json({ task });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal mengubah tugas.' }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const studentOnly = new URL(req.url).searchParams.get('student') === '1';
    if (studentOnly) {
      await deleteStudentById(id);
      return NextResponse.json({ ok: true });
    }
    await deleteStudentTaskById(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal menghapus.' }, { status: 400 });
  }
}
