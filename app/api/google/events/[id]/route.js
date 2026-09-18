import { NextResponse } from 'next/server';
import { getAuthedClient, getCalendarApi } from '../../../../lib/google';

function needsConnectResponse() {
  return NextResponse.json(
    { error: 'Google Calendar belum terhubung. Klik "Hubungkan Google" dulu.', needsConnect: true },
    { status: 409 }
  );
}

// PATCH /api/google/events/:id — ubah { title?, description?, start?, end? }.
// start/end: string ISO/RFC3339 (mis. '2026-09-20T10:00:00+07:00') atau tanggal 'YYYY-MM-DD' (seharian).
export async function PATCH(req, { params }) {
  try {
    const oauth = await getAuthedClient(req.nextUrl.origin);
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID event wajib diisi.' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const resource = {};
    if (typeof body.title === 'string' && body.title.trim()) {
      resource.summary = body.title.trim().slice(0, 200);
    }
    if (typeof body.description === 'string') {
      resource.description = body.description.trim().slice(0, 2000);
    }
    const asDateTime = (v) => {
      if (typeof v !== 'string' || !v) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { date: v };
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return null;
      return { dateTime: d.toISOString(), timeZone: 'Asia/Jakarta' };
    };
    const s = asDateTime(body.start);
    const e = asDateTime(body.end);
    if (s) resource.start = s;
    if (e) resource.end = e;
    if (Object.keys(resource).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field valid untuk diubah.' }, { status: 400 });
    }
    const cal = getCalendarApi(oauth);
    const { data } = await cal.events.patch({ calendarId: 'primary', eventId: id, resource });
    return NextResponse.json({ ok: true, event: { id: data.id, title: data.summary } });
  } catch (e) {
    if (e?.needsConnect) return needsConnectResponse();
    return NextResponse.json({ error: e?.message || 'Gagal mengubah event.' }, { status: 500 });
  }
}

// DELETE /api/google/events/:id — hapus event.
export async function DELETE(_req, { params }) {
  try {
    const oauth = await getAuthedClient(_req.nextUrl.origin);
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID event wajib diisi.' }, { status: 400 });
    const cal = getCalendarApi(oauth);
    await cal.events.delete({ calendarId: 'primary', eventId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e?.needsConnect) return needsConnectResponse();
    return NextResponse.json({ error: e?.message || 'Gagal menghapus event.' }, { status: 500 });
  }
}
