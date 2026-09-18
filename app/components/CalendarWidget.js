'use client';
import { useEffect, useState } from 'react';

export const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Widget kalender bulan (Indonesia, minggu mulai Senin).
// Dipakai di dalam chat (via tag [CALENDAR:YYYY-MM]) dan halaman /kalender.
export default function CalendarWidget({ initialYear, initialMonth, onSelect, onMonthChange, dots, variant = 'compact' }) {
  const now = new Date();
  const [viewY, setViewY] = useState(initialYear ?? now.getFullYear());
  const [viewM, setViewM] = useState(initialMonth ?? now.getMonth());
  const [selected, setSelected] = useState(null);

  // Sync saat tag [CALENDAR:] beda per pesan (key di Message me-remount,
  // effect ini fallback bila dipakai tanpa key).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sinkronisasi props ke view yang disengaja */
    if (typeof initialYear === 'number') setViewY(initialYear);
    if (typeof initialMonth === 'number') setViewM(initialMonth);
    setSelected(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialYear, initialMonth]);

  useEffect(() => {
    onMonthChange?.(viewY, viewM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewY, viewM]);

  const dayKey = (d) => `${viewY}-${String(viewM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dotFor = (d) => (dots && d ? dots[dayKey(d)] : null);

  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const offset = (new Date(viewY, viewM, 1).getDay() + 6) % 7; // Senin = 0
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const isToday = (d) =>
    d && viewY === now.getFullYear() && viewM === now.getMonth() && d === now.getDate();

  const go = (delta) => {
    setSelected(null);
    const d = new Date(viewY, viewM + delta, 1);
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
  };

  const goToday = () => {
    setSelected(null);
    setViewY(now.getFullYear());
    setViewM(now.getMonth());
  };

  const pick = (d) => {
    if (!d) return;
    setSelected(d);
    onSelect?.({ year: viewY, month: viewM + 1, day: d });
  };

  const btn =
    'rounded-lg p-1.5 text-blue-600 transition hover:bg-neutral-200 dark:text-blue-400 dark:hover:bg-zinc-800';

  // Varian full ala Google Calendar: grid besar, tanggal bulan tetangga redup.
  if (variant === 'full') {
    const prevDays = new Date(viewY, viewM, 0).getDate();
    const leading = Array.from({ length: offset }, (_, i) => prevDays - offset + 1 + i);
    const trailingCount = 42 - offset - daysInMonth;
    const trailing = Array.from({ length: trailingCount }, (_, i) => i + 1);

    const numCls = (d) =>
      `flex h-7 w-7 items-center justify-center rounded-full text-[13px] ${
        isToday(d)
          ? 'bg-blue-600 font-semibold text-white shadow-[0_0_10px_rgba(59,130,246,0.6)]'
          : selected === d
            ? 'font-medium text-blue-600 dark:text-blue-400'
            : ''
      }`;

    return (
      <div className="w-full rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-zinc-900 sm:p-5">
        <div className="mb-3 flex items-center gap-1">
          <button onClick={() => go(-1)} aria-label="Bulan sebelumnya" className={btn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="flex-1 text-center text-base font-semibold">
            {MONTHS[viewM]} {viewY}
          </p>
          <button onClick={() => go(1)} aria-label="Bulan berikutnya" className={btn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={goToday}
            className="ml-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-blue-400 dark:hover:bg-zinc-800"
          >
            Hari ini
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((d) => (
            <div key={d} className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {d}
            </div>
          ))}
          {leading.map((d) => (
            <div
              key={`p-${d}`}
              className="min-h-20 cursor-default rounded-lg p-1.5 align-top sm:min-h-24"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] text-neutral-300 dark:text-neutral-600">
                {d}
              </span>
            </div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <button
              key={`c-${d}`}
              onClick={() => pick(d)}
              className={`min-h-20 rounded-lg border p-1.5 text-left align-top transition sm:min-h-24 ${
                selected === d && !isToday(d)
                  ? 'border-blue-500/60 bg-blue-500/10'
                  : 'border-neutral-200 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-zinc-800/70'
              }`}
            >
              <span className={numCls(d)}>{d}</span>
              {dotFor(d) && (dotFor(d).hasNote || dotFor(d).todoTotal > 0 || dotFor(d).studentTotal > 0 || dotFor(d).googleCount > 0) && (
                <span className="mt-1 flex items-center gap-1">
                  {dotFor(d).hasNote && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Ada jurnal" />}
                  {dotFor(d).todoTotal > 0 && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${dotFor(d).todoDone >= dotFor(d).todoTotal ? 'bg-blue-500' : 'bg-amber-500'}`}
                      title={`${dotFor(d).todoDone}/${dotFor(d).todoTotal} to-do selesai`}
                    />
                  )}
                  {dotFor(d).studentTotal > 0 && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${dotFor(d).studentUnread > 0 ? 'bg-violet-500' : 'bg-violet-300 dark:bg-violet-800'}`}
                      title={dotFor(d).studentUnread > 0 ? `${dotFor(d).studentUnread} catatan murid belum dibaca` : 'Catatan murid sudah dibaca'}
                    />
                  )}
                  {dotFor(d).googleCount > 0 && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-rose-500"
                      title={`${dotFor(d).googleCount} event Google Calendar`}
                    />
                  )}
                  {dotFor(d).todoTotal > 0 && (
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      {dotFor(d).todoDone}/{dotFor(d).todoTotal}
                    </span>
                  )}
                  {dotFor(d).studentUnread > 0 && (
                    <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">
                      {dotFor(d).studentUnread} murid
                    </span>
                  )}
                  {dotFor(d).googleCount > 0 && (
                    <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                      {dotFor(d).googleCount} Google
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
          {trailing.map((d) => (
            <div
              key={`n-${d}`}
              className="min-h-20 cursor-default rounded-lg p-1.5 align-top sm:min-h-24"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] text-neutral-300 dark:text-neutral-600">
                {d}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center gap-1">
        <button onClick={() => go(-1)} aria-label="Bulan sebelumnya" className={btn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="flex-1 text-center text-sm font-semibold">
          {MONTHS[viewM]} {viewY}
        </p>
        <button onClick={() => go(1)} aria-label="Bulan berikutnya" className={btn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
            {d}
          </div>
        ))}
        {cells.map((d, i) => (
          <div key={i} className="flex justify-center py-0.5">
            {d ? (
              <button
                onClick={() => pick(d)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition ${
                  isToday(d)
                    ? 'bg-blue-600 font-semibold text-white shadow-[0_0_10px_rgba(59,130,246,0.6)]'
                    : selected === d
                      ? 'border border-blue-500 font-medium text-blue-600 dark:text-blue-400'
                      : 'hover:bg-neutral-200 dark:hover:bg-zinc-800'
                }`}
              >
                {d}
              {dotFor(d) && (dotFor(d).hasNote || dotFor(d).todoTotal > 0 || dotFor(d).studentTotal > 0 || dotFor(d).googleCount > 0) && (
                  <span className="absolute -bottom-0.5 flex gap-0.5">
                    {dotFor(d).hasNote && <span className="h-1 w-1 rounded-full bg-emerald-500" />}
                    {dotFor(d).todoTotal > 0 && <span className="h-1 w-1 rounded-full bg-amber-500" />}
                    {dotFor(d).studentUnread > 0 && <span className="h-1 w-1 rounded-full bg-violet-500" />}
                    {dotFor(d).googleCount > 0 && <span className="h-1 w-1 rounded-full bg-rose-500" />}
                  </span>
                )}
              </button>
            ) : (
              <span className="h-8 w-8" />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={goToday}
        className="mt-2 w-full rounded-lg border border-neutral-200 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-blue-400 dark:hover:bg-zinc-800"
      >
        Hari ini
      </button>
    </div>
  );
}
