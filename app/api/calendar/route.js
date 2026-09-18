import { NextResponse } from 'next/server';
import { isValidMonth, getMonthMap, storageMode } from '../../lib/diary-store';
import { getAuthedClient, getCalendarApi } from '../../lib/google';

// GET /api/calendar?month=YYYY-MM — peta { "YYYY-MM-DD": { hasNote, todoTotal, todoDone, ..., googleCount } }
// Event Google digabung best-effort: kalau belum connect / belum dikonfigurasi, dilewati diam-diam.
async function getGoogleCounts(origin, month) {
  const counts = {};
  try {
    const oauth = await getAuthedClient(origin);
    const cal = getCalendarApi(oauth);
    const [y, m] = month.split('-').map(Number);
    const timeMin = new Date(Date.UTC(y, m - 1, 1)).toISOString();
    const timeMax = new Date(Date.UTC(y, m, 1)).toISOString();
    const { data } = await cal.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    for (const ev of data.items || []) {
      if (ev.status === 'cancelled') continue;
      const s = ev.start || {};
      let key = null;
      if (s.date) key = s.date;
      else if (s.dateTime) key = fmt.format(new Date(s.dateTime));
      if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) counts[key] = (counts[key] || 0) + 1;
    }
    return { counts, connected: true };
  } catch {
    return { counts, connected: false };
  }
}

export async function GET(req) {
  try {
    const month = new URL(req.url).searchParams.get('month');
    if (!isValidMonth(month)) {
      return NextResponse.json({ error: 'Param "month" harus format YYYY-MM.' }, { status: 400 });
    }
    const map = await getMonthMap(month);
    const { counts, connected } = await getGoogleCounts(req.nextUrl.origin, month);
    for (const [date, n] of Object.entries(counts)) {
      map[date] = { ...(map[date] || {}), googleCount: n };
    }
    return NextResponse.json({ month, days: map, mode: storageMode(), googleConnected: connected });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal memuat kalender.' }, { status: 500 });
  }
}
