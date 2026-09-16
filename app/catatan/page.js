'use client';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtTanggal(dateStr) {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const PRIORITY = [
  { id: 'low', label: 'Rendah' },
  { id: 'medium', label: 'Sedang' },
  { id: 'high', label: 'Tinggi' },
];

export default function Catatan() {
  return (
    <Suspense fallback={<p className="p-10 text-center text-sm text-neutral-500">Memuat...</p>}>
      <CatatanInner />
    </Suspense>
  );
}

function CatatanInner() {
  const searchParams = useSearchParams();
  const initialDate = (() => {
    const q = searchParams.get('date');
    return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : todayLocal();
  })();
  const [date, setDate] = useState(initialDate);
  const [note, setNote] = useState('');
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [mode, setMode] = useState('file');
  const [error, setError] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [preview, setPreview] = useState(false);
  const saveTimer = useRef(null);
  // Inbox catatan murid
  const [tab, setTab] = useState('jurnal');
  const [students, setStudents] = useState([]);
  const [sLoading, setSLoading] = useState(false);
  const [sDate, setSDate] = useState('');
  const [studentQ, setStudentQ] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async (d) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/daily?date=${d}`);
      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}).`);
      }
      if (!res.ok) throw new Error(data.error || 'Gagal memuat data.');
      setNote(data.notes?.[0]?.content || '');
      setTodos(data.todos || []);
      setMode(data.mode || 'file');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- fetch data by date, setState di callback async */
    load(date);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [date, load]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const saveNote = useCallback(
    async (text) => {
      if (!text.trim()) return;
      setSaving(true);
      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, content: text }),
        });
        let data = {};
        try {
          data = await res.json();
        } catch {
          throw new Error(`Server error (${res.status}).`);
        }
        if (!res.ok) throw new Error(data.error || 'Gagal menyimpan.');
        setSavedAt(new Date());
        setMode(data.mode || mode);
      } catch (e) {
        setError(e.message);
      } finally {
        setSaving(false);
      }
    },
    [date, mode]
  );

  const onNoteChange = (v) => {
    setNote(v);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNote(v), 1200);
  };

  const addTodo = async (e) => {
    e?.preventDefault();
    const title = newTodo.trim();
    if (!title) return;
    setError('');
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, title, priority: newPriority }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}).`);
      }
      if (!res.ok) throw new Error(data.error || 'Gagal menambah to-do.');
      setTodos((prev) => [...prev, data.todo]);
      setNewTodo('');
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleTodo = async (t) => {
    try {
      const res = await fetch(`/api/todos/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !t.done }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}).`);
      }
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah to-do.');
      setTodos((prev) => prev.map((x) => (x.id === t.id ? data.todo : x)));
    } catch (e) {
      setError(e.message);
    }
  };

  const removeTodo = async (id) => {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus to-do.');
      setTodos((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const doneCount = todos.filter((t) => t.done).length;

  const refreshUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/student-notes?count=unread');
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.unread === 'number') setUnread(data.unread);
    } catch {
      // abaikan
    }
  }, []);

  const loadStudents = useCallback(async () => {
    setSLoading(true);
    try {
      const p = new URLSearchParams();
      if (sDate) p.set('date', sDate);
      if (unreadOnly) p.set('unreadOnly', '1');
      if (studentQ.trim()) p.set('q', studentQ.trim());
      const res = await fetch(`/api/student-notes?${p.toString()}`);
      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}).`);
      }
      if (!res.ok) throw new Error(data.error || 'Gagal memuat catatan murid.');
      setStudents(data.notes || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setSLoading(false);
    }
  }, [sDate, unreadOnly, studentQ]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- muat badge unread sekali saat buka halaman */
    refreshUnread();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refreshUnread]);

  useEffect(() => {
    if (tab !== 'murid') return;
    /* eslint-disable react-hooks/set-state-in-effect -- muat inbox saat tab dibuka */
    loadStudents();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [tab, loadStudents]);

  const markStudent = async (s, isRead) => {
    try {
      const res = await fetch(`/api/student-notes/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: isRead }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}).`);
      }
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status.');
      setStudents((prev) => prev.map((x) => (x.id === s.id ? data.note : x)));
      refreshUnread();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeStudent = async (s) => {
    if (!window.confirm(`Hapus catatan dari ${s.name}?`)) return;
    try {
      const res = await fetch(`/api/student-notes/${s.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus catatan murid.');
      setStudents((prev) => prev.filter((x) => x.id !== s.id));
      refreshUnread();
    } catch (e) {
      setError(e.message);
    }
  };

  const copyToJournal = async (s) => {
    const header = `\n\n---\nCatatan ${s.name} (${s.class}, ${fmtTanggal(s.date)}):\n`;
    const next = `${note}${header}${s.content}`;
    setNote(next);
    setTab('jurnal');
    await saveNote(next);
  };

  const fmtTime = (iso) => {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

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
        <span className="px-1 text-[15px] font-medium">Catatan Harian</span>
        <span className="ml-2 hidden rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500 sm:block dark:border-neutral-800 dark:text-neutral-400">
          {mode === 'supabase' ? 'Tersimpan permanen (Supabase)' : 'Tersimpan permanen (server lokal)'}
        </span>
        <div className="flex-1" />
        <Link
          href="/kalender"
          className="rounded-xl px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-neutral-200 dark:text-blue-400 dark:hover:bg-zinc-800"
        >
          Kalender
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-10">
        <div className="mx-auto w-full max-w-3xl space-y-4 pt-6">
          {tab === 'jurnal' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-800 dark:bg-zinc-900"
              />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{fmtTanggal(date)}</p>
              <div className="flex-1" />
              <button
                onClick={() => setDate(todayLocal())}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-blue-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-blue-400 dark:hover:bg-zinc-800"
              >
                Hari ini
              </button>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Tab Jurnal / Catatan Murid */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab('jurnal')}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                tab === 'jurnal'
                  ? 'bg-blue-600 text-white'
                  : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-zinc-800'
              }`}
            >
              Jurnal Saya
            </button>
            <button
              onClick={() => setTab('murid')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                tab === 'murid'
                  ? 'bg-violet-600 text-white'
                  : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-zinc-800'
              }`}
            >
              Catatan Murid
              {unread > 0 && (
                <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold ${
                  tab === 'murid' ? 'bg-white text-violet-700' : 'bg-violet-600 text-white'
                }`}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          </div>

          {tab === 'murid' ? (
            <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-zinc-900">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={sDate}
                  onChange={(e) => setSDate(e.target.value)}
                  title="Filter tanggal (kosongkan = semua)"
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-violet-500 dark:border-neutral-800 dark:bg-zinc-950"
                />
                {sDate && (
                  <button
                    onClick={() => setSDate('')}
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-zinc-800"
                  >
                    Semua tanggal
                  </button>
                )}
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <input
                    type="checkbox"
                    checked={unreadOnly}
                    onChange={(e) => setUnreadOnly(e.target.checked)}
                    className="h-4 w-4 accent-violet-600"
                  />
                  Belum dibaca saja
                </label>
                <div className="flex-1" />
                <button
                  onClick={refreshUnread}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-violet-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-violet-400 dark:hover:bg-zinc-800"
                >
                  Muat ulang
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loadStudents();
                }}
                className="mb-3 flex gap-2"
              >
                <input
                  value={studentQ}
                  onChange={(e) => setStudentQ(e.target.value)}
                  placeholder="Cari nama, kelas, atau isi catatan..."
                  className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-violet-500 dark:border-neutral-800 dark:bg-zinc-950"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
                >
                  Cari
                </button>
              </form>
              {sLoading ? (
                <p className="py-6 text-center text-sm text-neutral-500">Memuat catatan murid...</p>
              ) : students.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-500">
                  Belum ada catatan murid{sDate ? ' di tanggal ini' : ''}. Bagikan link{' '}
                  <span className="font-mono text-xs">/isi-catatan</span> + kode kelas ke murid.
                </p>
              ) : (
                <ul className="space-y-3">
                  {students.map((s) => (
                    <li
                      key={s.id}
                      className={`rounded-xl border p-3 text-sm ${
                        s.is_read
                          ? 'border-neutral-200 dark:border-neutral-800'
                          : 'border-violet-300 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20'
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{s.name}</span>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500 dark:bg-zinc-800 dark:text-neutral-400">
                          {s.class}
                        </span>
                        {!s.is_read && (
                          <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-medium text-white">
                            Baru
                          </span>
                        )}
                        <div className="flex-1" />
                        <span className="text-[11px] text-neutral-400">
                          {fmtTanggal(s.date)}{s.created_at ? ` · ${fmtTime(s.created_at)}` : ''}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-neutral-700 dark:text-neutral-300">
                        {s.content}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => markStudent(s, !s.is_read)}
                          className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-zinc-800"
                        >
                          {s.is_read ? 'Tandai belum dibaca' : 'Tandai dibaca'}
                        </button>
                        <button
                          onClick={() => copyToJournal(s)}
                          className="rounded-lg border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/40"
                        >
                          Salin ke jurnal
                        </button>
                        <button
                          onClick={() => removeStudent(s)}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          Hapus
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : loading ? (
            <p className="py-10 text-center text-sm text-neutral-500">Memuat catatan...</p>
          ) : (
            <>
              <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-zinc-900">
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Jurnal harian</h2>
                  <div className="flex-1" />
                  <button
                    onClick={() => setPreview((v) => !v)}
                    className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-neutral-100 dark:text-blue-400 dark:hover:bg-zinc-800"
                  >
                    {preview ? 'Edit' : 'Preview'}
                  </button>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {saving ? 'Menyimpan...' : savedAt ? `Tersimpan ${savedAt.toLocaleTimeString('id-ID')}` : 'Otomatis tersimpan'}
                  </span>
                </div>
                {preview ? (
                  <div className="prose prose-sm min-h-32 max-w-none dark:prose-invert">
                    {note ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{note}</ReactMarkdown> : <p className="text-neutral-500">Belum ada catatan.</p>}
                  </div>
                ) : (
                  <textarea
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    onBlur={() => saveNote(note)}
                    rows={7}
                    placeholder="Tulis kegiatanmu hari ini... (mendukung markdown, otomatis tersimpan)"
                    className="w-full resize-y rounded-xl border border-neutral-200 bg-white p-3 text-sm leading-relaxed outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-800 dark:bg-zinc-950"
                  />
                )}
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-zinc-900">
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-semibold">To-do list</h2>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-zinc-800 dark:text-neutral-400">
                    {doneCount}/{todos.length} selesai
                  </span>
                </div>
                <form onSubmit={addTodo} className="mb-3 flex gap-2">
                  <input
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    placeholder="Tambah kegiatan, mis. Olahraga 30 menit"
                    maxLength={200}
                    className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-800 dark:bg-zinc-950"
                  />
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="rounded-xl border border-neutral-200 bg-white px-2 py-2 text-sm outline-none dark:border-neutral-800 dark:bg-zinc-950"
                    title="Prioritas"
                  >
                    {PRIORITY.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                  >
                    Tambah
                  </button>
                </form>
                {todos.length === 0 ? (
                  <p className="py-2 text-sm text-neutral-500">Belum ada to-do di tanggal ini.</p>
                ) : (
                  <ul className="space-y-2">
                    {todos.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
                      >
                        <button
                          onClick={() => toggleTodo(t)}
                          aria-label={t.done ? 'Tandai belum selesai' : 'Tandai selesai'}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                            t.done
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-neutral-300 hover:border-blue-500 dark:border-neutral-700'
                          }`}
                        >
                          {t.done && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className={`min-w-0 flex-1 ${t.done ? 'text-neutral-400 line-through' : ''}`}>{t.title}</span>
                        <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] sm:block ${
                          t.priority === 'high'
                            ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                            : t.priority === 'low'
                              ? 'bg-neutral-100 text-neutral-500 dark:bg-zinc-800 dark:text-neutral-400'
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                        }`}>
                          {PRIORITY.find((p) => p.id === t.priority)?.label || 'Sedang'}
                        </span>
                        <button
                          onClick={() => removeTodo(t.id)}
                          aria-label="Hapus to-do"
                          className="shrink-0 rounded p-1.5 text-neutral-400 transition hover:text-red-500"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 4h4m-7 3l1 13h8l1-13" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
