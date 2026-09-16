import { NextResponse } from 'next/server';
import { isValidDate, getDaily, storageMode } from '../../lib/diary-store';

// GET /api/daily?date=YYYY-MM-DD — gabungan notes + todos 1 tanggal.
export async function GET(req) {
  try {
    const date = new URL(req.url).searchParams.get('date');
    if (!isValidDate(date)) {
      return NextResponse.json({ error: 'Param "date" harus format YYYY-MM-DD.' }, { status: 400 });
    }
    const daily = await getDaily(date);
    return NextResponse.json({ ...daily, mode: storageMode() });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal memuat data harian.' }, { status: 500 });
  }
}
