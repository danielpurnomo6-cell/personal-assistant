import { NextResponse } from 'next/server';
import { getAuthedClient, getCalendarApi } from '../../../lib/google';
import { isValidDate } from '../../../lib/diary-store';

const TZ = 'Asia/Jakarta';

function toClientEvent(ev) {
  const start = ev.start || {};
  const end = ev.end || {};
  return {
    id: ev.id,
    title: ev.summary || '(Tanpa judul)',
    start: start.dateTime || start.date || null,
    end: end.dateTime || end.date || null,
    allDay: Boolean(start.date && !start.dateTime),
    link: ev.htmlLink || null,
    status: ev.status || null,
    recurring: Boolean(ev.recurringEventId),
  };
}

function needsConnectResponse() {
  return NextResponse.json(
    { error: 'Google Calendar belum terhubung. Klik "Hubungkan Google" dulu.', needsConnect: true },
    { status: 409 }
  );
}

// GET /api/google/events?timeMin=ISO&timeMax=ISO — daftar event (default: 60 hari ke depan).
export async function GET(req) {
  try {
    const oauth = await getAuthedClient(req.nextUrl.origin);
    const params = req.nextUrl.searchParams;
    const now = new Date();
    const timeMin = params.get('timeMin') || now.toISOString();
    const timeMax =
      params.get('timeMax') || new Date(now.getTime() + 60 * 24 * 3600 * 1000).toISOString();
    const cal = getCalendarApi(oauth);
    const { data } = await cal.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });
    return NextResponse.json({ events: (data.items || []).map(toClientEvent) });
  } catch (e) {
    if (e?.needsConnect) return needsConnectResponse();
    return NextResponse.json({ error: e?.message || 'Gagal memuat event Google.' }, { status: 500 });
  }
}

// POST /api/google/events — buat event.
// Body: { title, date: 'YYYY-MM-DD', startTime?: 'HH:MM', endTime?: 'HH:MM', description? }
// Tanpa startTime = event seharian.
export async function POST(req) {
  try {
    const oauth = await getAuthedClient(req.nextUrl.origin);
    const body = await req.json().catch(() => ({}));
    const title = (body.title || '').trim().slice(0, 200);
    if (!title) return NextResponse.json({ error: 'Judul event wajib diisi.' }, { status: 400 });
    if (!isValidDate(body.date)) {
      return NextResponse.json({ error: 'Tanggal harus format YYYY-MM-DD.' }, { status: 400 });
    }
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    const resource = { summary: title, description: (body.description || '').trim().slice(0, 2000) || undefined };
    if (body.startTime) {
      if (!timeRe.test(body.startTime)) {
        return NextResponse.json({ error: 'Jam mulai harus format HH:MM.' }, { status: 400 });
      }
      const endTime = timeRe.test(body.endTime || '') ? body.endTime : null;
      resource.start = { dateTime: `${body.date}T${body.startTime}:00+07:00`, timeZone: TZ };
      resource.end = endTime
        ? { dateTime: `${body.date}T${endTime}:00+07:00`, timeZone: TZ }
        : { dateTime: `${body.date}T${body.startTime}:00+07:00`, timeZone: TZ };
      // Default durasi 1 jam bila jam selesai tidak diisi.
      if (!endTime) {
        const d = new Date(`${body.date}T${body.startTime}:00+07:00`);
        d.setHours(d.getHours() + 1);
        const pad = (n) => String(n).padStart(2, '0');
        resource.end = {
          dateTime: `${body.date}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+07:00`,
          timeZone: TZ,
        };
      }
    } else {
      resource.start = { date: body.date };
      resource.end = { date: body.date };
    }
    const cal = getCalendarApi(oauth);
    const { data } = await cal.events.insert({ calendarId: 'primary', resource });
    return NextResponse.json({ event: toClientEvent(data) });
  } catch (e) {
    if (e?.needsConnect) return needsConnectResponse();
    return NextResponse.json({ error: e?.message || 'Gagal membuat event.' }, { status: 500 });
  }
}
