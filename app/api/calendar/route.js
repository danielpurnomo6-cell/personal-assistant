import { NextResponse } from 'next/server';
import { isValidMonth, getMonthMap, storageMode } from '../../lib/diary-store';

// GET /api/calendar?month=YYYY-MM — peta { "YYYY-MM-DD": { hasNote, todoTotal, todoDone } }
export async function GET(req) {
  try {
    const month = new URL(req.url).searchParams.get('month');
    if (!isValidMonth(month)) {
      return NextResponse.json({ error: 'Param "month" harus format YYYY-MM.' }, { status: 400 });
    }
    const map = await getMonthMap(month);
    return NextResponse.json({ month, days: map, mode: storageMode() });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal memuat kalender.' }, { status: 500 });
  }
}
