'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import CalendarWidget, { MONTHS } from '../components/CalendarWidget';

function toDateStr(sel) {
  if (!sel) return null;
  return `${sel.year}-${String(sel.month).padStart(2, '0')}-${String(sel.day).padStart(2, '0')}`;
}

export default function Kalender() {
  const [sel, setSel] = useState(null);
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dots, setDots] = useState({});
  const [daily, setDaily] = useState(null);
  const [loadingDaily, setLoadingDaily] = useState(false);

  const onMonthChange = useCallback((y, mIdx) => {
    setMonth(`${y}-${String(mIdx + 1).padStart(2, '0')}`);
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(`/api/calendar?month=${month}`);
        let data = {};
        try {
          data = await res.json();
        } catch {
          return;
        }
        if (!cancel && res.ok) setDots(data.days || {});
      } catch {
        // abaikan
      }
    })();
    return () => {
      cancel = true;
    };
  }, [month]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset + fetch daily saat tanggal dipilih */
    const ds = toDateStr(sel);
    if (!ds) {
      setDaily(null);
      return;
    }
    let cancel = false;
    setLoadingDaily(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    (async () => {
      try {
        const res = await fetch(`/api/daily?date=${ds}`);
        let data = null;
        try {
          data = await res.json();
        } catch {
          return;
        }
        if (!cancel && res.ok) setDaily(data);
      } catch {
        // abaikan
      } finally {
        if (!cancel) setLoadingDaily(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [sel]);

  const dateStr = toDateStr(sel);

  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900 dark:bg-zinc-950 dark:text-neutral-100">
      <header className="flex items-center gap-1 border-b border-neutral-200 bg-white/70 px-3 py-2.5 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/40">
        <Link
          href="/"
          aria-label="Kembali ke chat"
          title="Kembali ke chat"
          className="rounded-full p-2 text-blue-600 transition hover:bg-neutral-200 dark:text-blue-400 dark:hover:bg-zinc-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="px-1 text-[15px] font-medium">Kalender</span>
        <div className="flex-1" />
        <Link
          href="/catatan"
          className="rounded-xl px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-neutral-200 dark:text-blue-400 dark:hover:bg-zinc-800"
        >
          Catatan Harian
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-10">
        <div className="mx-auto w-full max-w-5xl space-y-3 pt-6">
          <CalendarWidget variant="full" onSelect={setSel} onMonthChange={onMonthChange} dots={dots} />
          <div className="flex flex-wrap items-center justify-center gap-3 px-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Jurnal</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> To-do belum selesai</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> To-do selesai</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Catatan murid belum dibaca</span>
          </div>

          {sel ? (
            <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-zinc-900">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold">
                  {sel.day} {MONTHS[sel.month - 1]} {sel.year}
                </h2>
                <div className="flex-1" />
                <Link
                  href={dateStr ? `/catatan?date=${dateStr}` : '/catatan'}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
                >
                  Buka di Catatan
                </Link>
              </div>
              {loadingDaily ? (
                <p className="text-sm text-neutral-500">Memuat...</p>
              ) : daily ? (
                <div className="space-y-2 text-sm">
                  {daily.notes?.[0]?.content ? (
                    <p className="line-clamp-3 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                      {daily.notes[0].content}
                    </p>
                  ) : (
                    <p className="text-neutral-500">Belum ada jurnal.</p>
                  )}
                  {daily.todos?.length > 0 ? (
                    <ul className="space-y-1">
                      {daily.todos.map((t) => (
                        <li key={t.id} className="flex items-center gap-2">
                          <span className={t.done ? 'text-emerald-500' : 'text-amber-500'}>
                            {t.done ? '✓' : '○'}
                          </span>
                          <span className={t.done ? 'text-neutral-400 line-through' : ''}>{t.title}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-neutral-500">Belum ada to-do.</p>
                  )}
                  {daily.summary?.studentTotal > 0 && (
                    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900 dark:bg-violet-950/20">
                      <p className="mb-2 text-xs font-semibold text-violet-700 dark:text-violet-300">
                        ✎ {daily.summary.studentTotal} catatan murid
                        {daily.summary.studentUnread > 0 && ` (${daily.summary.studentUnread} belum dibaca)`}
                      </p>
                      <ul className="space-y-1.5">
                        {(daily.studentNotes || []).map((s) => (
                          <li key={s.id} className="flex items-start gap-2">
                            <span className={s.is_read ? 'text-neutral-400' : 'text-violet-500'}>
                              {s.is_read ? '✓' : '●'}
                            </span>
                            <span className="min-w-0">
                              <span className="font-medium">{s.name}</span>
                              <span className="text-neutral-500"> ({s.class}): </span>
                              <span className="line-clamp-2 text-neutral-600 dark:text-neutral-400">
                                {s.content}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={dateStr ? `/catatan?date=${dateStr}` : '/catatan'}
                        className="mt-2 inline-block text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                      >
                        Kelola di tab Catatan Murid →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">Belum ada data.</p>
              )}
            </section>
          ) : (
            <p className="px-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Ketuk tanggal untuk melihat jurnal & to-do hari itu.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
