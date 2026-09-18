'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import CalendarWidget, { MONTHS } from '../components/CalendarWidget';

function toDateStr(sel) {
  if (!sel) return null;
  return `${sel.year}-${String(sel.month).padStart(2, '0')}-${String(sel.day).padStart(2, '0')}`;
}

function addDays(ds, n) {
  const [y, m, d] = ds.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
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
  // Google Calendar
  const [gStatus, setGStatus] = useState(null); // { connected, email } | null
  const [gEvents, setGEvents] = useState([]);
  const [gLoading, setGLoading] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'ok'|'err', text }
  const [showCreate, setShowCreate] = useState(false);
  const [gTitle, setGTitle] = useState('');
  const [gStart, setGStart] = useState('');
  const [gEnd, setGEnd] = useState('');
  const [gDesc, setGDesc] = useState('');
  const [gSaving, setGSaving] = useState(false);
  const [gDeleting, setGDeleting] = useState(null);

  const onMonthChange = useCallback((y, mIdx) => {
    setMonth(`${y}-${String(mIdx + 1).padStart(2, '0')}`);
  }, []);

  // Status koneksi Google + notifikasi hasil OAuth (sekali saat buka).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- inisialisasi sekali saat buka */
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('connected') === '1') setNotice({ type: 'ok', text: 'Google Calendar terhubung.' });
      else if (q.get('google_error')) setNotice({ type: 'err', text: q.get('google_error') });
      if (q.get('connected') || q.get('google_error')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch {
      // abaikan
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    (async () => {
      try {
        const res = await fetch('/api/google/status');
        const data = await res.json().catch(() => ({}));
        if (res.ok) setGStatus(data);
      } catch {
        // abaikan
      }
    })();
  }, []);

  const refreshDots = useCallback(async () => {
    try {
      const res = await fetch(`/api/calendar?month=${month}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDots(data.days || {});
    } catch {
      // abaikan
    }
  }, [month]);

  const fetchDayGoogle = useCallback(
    async (ds) => {
      if (!gStatus?.connected || !ds) {
        setGEvents([]);
        return;
      }
      setGLoading(true);
      try {
        const tMin = encodeURIComponent(`${ds}T00:00:00+07:00`);
        const tMax = encodeURIComponent(`${addDays(ds, 1)}T00:00:00+07:00`);
        const res = await fetch(`/api/google/events?timeMin=${tMin}&timeMax=${tMax}`);
        const data = await res.json().catch(() => ({}));
        setGEvents(res.ok ? data.events || [] : []);
      } catch {
        setGEvents([]);
      } finally {
        setGLoading(false);
      }
    },
    [gStatus]
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- muat event Google saat tanggal dipilih */
    fetchDayGoogle(toDateStr(sel));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [sel, fetchDayGoogle]);

  const createGoogleEvent = async (e) => {
    e?.preventDefault();
    const ds = toDateStr(sel);
    if (!ds || !gTitle.trim() || gSaving) return;
    setGSaving(true);
    try {
      const res = await fetch('/api/google/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: gTitle.trim(),
          date: ds,
          startTime: gStart || undefined,
          endTime: gEnd || undefined,
          description: gDesc.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal membuat event.');
      setGTitle('');
      setGStart('');
      setGEnd('');
      setGDesc('');
      setShowCreate(false);
      await fetchDayGoogle(ds);
      await refreshDots();
    } catch (err) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setGSaving(false);
    }
  };

  const deleteGoogleEvent = async (id) => {
    if (!id || gDeleting || !window.confirm('Hapus event ini dari Google Calendar?')) return;
    setGDeleting(id);
    try {
      const res = await fetch(`/api/google/events/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus event.');
      await fetchDayGoogle(toDateStr(sel));
      await refreshDots();
    } catch (err) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setGDeleting(null);
    }
  };

  const disconnectGoogle = async () => {
    if (!window.confirm('Putus koneksi Google Calendar?')) return;
    try {
      await fetch('/api/google/disconnect', { method: 'POST' });
      setGStatus({ connected: false });
      setGEvents([]);
      await refreshDots();
    } catch {
      // abaikan
    }
  };

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
        {gStatus?.connected ? (
          <span
            className="hidden items-center gap-2 px-2 text-xs text-neutral-500 sm:flex dark:text-neutral-400"
            title={gStatus.email || ''}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            {gStatus.email || 'Google terhubung'}
            <button
              onClick={disconnectGoogle}
              className="font-medium text-rose-600 hover:underline dark:text-rose-400"
            >
              Putus
            </button>
          </span>
        ) : (
          <a
            href="/api/google/auth"
            className="rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-neutral-200 dark:text-rose-400 dark:hover:bg-zinc-800"
          >
            Hubungkan Google
          </a>
        )}
        <Link
          href="/catatan"
          className="rounded-xl px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-neutral-200 dark:text-blue-400 dark:hover:bg-zinc-800"
        >
          Catatan Harian
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-10">
        <div className="mx-auto w-full max-w-5xl space-y-3 pt-6">
          {notice && (
            <p
              className={`rounded-xl border px-3 py-2 text-center text-sm ${
                notice.type === 'ok'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-red-300 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400'
              }`}
            >
              {notice.text}
            </p>
          )}
          <CalendarWidget variant="full" onSelect={setSel} onMonthChange={onMonthChange} dots={dots} />
          <div className="flex flex-wrap items-center justify-center gap-3 px-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Jurnal</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> To-do belum selesai</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> To-do selesai</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Catatan murid belum dibaca</span>
            {Object.values(dots).some((d) => d && d.googleCount > 0) && (
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Google Calendar</span>
            )}
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
                  {gStatus?.connected && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900 dark:bg-rose-950/20">
                      <p className="mb-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                        ◉ Event Google
                      </p>
                      {gLoading ? (
                        <p className="text-neutral-500">Memuat event Google...</p>
                      ) : gEvents.length > 0 ? (
                        <ul className="space-y-1.5">
                          {gEvents.map((ev) => (
                            <li key={ev.id} className="flex items-start gap-2">
                              <span className="min-w-0 flex-1">
                                <span className="font-medium">{ev.title}</span>{' '}
                                <span className="text-neutral-500">
                                  {ev.allDay ? '(seharian)' : ev.start ? `(${fmtTime(ev.start)}${ev.end ? `–${fmtTime(ev.end)}` : ''})` : ''}
                                </span>
                              </span>
                              <button
                                onClick={() => deleteGoogleEvent(ev.id)}
                                disabled={gDeleting === ev.id}
                                className="shrink-0 text-xs font-medium text-rose-600 hover:underline disabled:opacity-50 dark:text-rose-400"
                              >
                                {gDeleting === ev.id ? '...' : 'Hapus'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-neutral-500">Tidak ada event Google hari ini.</p>
                      )}
                      {!showCreate ? (
                        <button
                          onClick={() => setShowCreate(true)}
                          className="mt-2 text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                        >
                          + Tambah event Google
                        </button>
                      ) : (
                        <form onSubmit={createGoogleEvent} className="mt-2 space-y-2">
                          <input
                            value={gTitle}
                            onChange={(e) => setGTitle(e.target.value)}
                            maxLength={200}
                            placeholder="Judul event"
                            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-zinc-950"
                          />
                          <div className="flex gap-2">
                            <label className="flex flex-1 items-center gap-1.5 text-xs text-neutral-500">
                              Mulai
                              <input
                                type="time"
                                value={gStart}
                                onChange={(e) => setGStart(e.target.value)}
                                className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-zinc-950"
                              />
                            </label>
                            <label className="flex flex-1 items-center gap-1.5 text-xs text-neutral-500">
                              Selesai
                              <input
                                type="time"
                                value={gEnd}
                                onChange={(e) => setGEnd(e.target.value)}
                                className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-zinc-950"
                              />
                            </label>
                          </div>
                          <p className="-mt-1 text-[11px] text-neutral-400">Kosongkan jam untuk event seharian.</p>
                          <input
                            value={gDesc}
                            onChange={(e) => setGDesc(e.target.value)}
                            maxLength={200}
                            placeholder="Deskripsi (opsional)"
                            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-zinc-950"
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={gSaving}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-500 disabled:opacity-60"
                            >
                              {gSaving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowCreate(false)}
                              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300"
                            >
                              Batal
                            </button>
                          </div>
                        </form>
                      )}
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
