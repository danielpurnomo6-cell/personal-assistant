'use client';
import { useEffect, useState } from 'react';

function fmtTanggal(dateStr) {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr || '';
  }
}

const KIND_META = {
  jadwal: { label: 'Jadwal Coach', chip: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
  konten: { label: 'Konten yang Harus Dibuat', chip: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' },
  todo: { label: 'To-do Saya', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
};

const inputCls =
  'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500 dark:border-neutral-800 dark:bg-zinc-950';

export default function Murid() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [student, setStudent] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressDraft, setProgressDraft] = useState({});
  const [savingId, setSavingId] = useState(null);

  // Pulihkan sesi login tersimpan.
  const login = async (n, c) => {
    const nm = (n ?? name).trim();
    const cd = (c ?? code).trim().toUpperCase();
    if (!nm || !cd) {
      setError('Isi nama dan kode murid dulu ya.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/student-tasks?name=${encodeURIComponent(nm)}&code=${encodeURIComponent(cd)}`);
      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}). Coba lagi ya.`);
      }
      if (!res.ok) throw new Error(data.error || 'Gagal masuk.');
      setStudent(data.student);
      setTasks(data.tasks || []);
      try {
        localStorage.setItem('pa-murid', JSON.stringify({ name: nm, code: cd }));
      } catch {
        // abaikan
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- pulihkan sesi login tersimpan sekali saat buka */
    try {
      const raw = localStorage.getItem('pa-murid');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.name && saved?.code) {
        setName(saved.name);
        setCode(saved.code);
        login(saved.name, saved.code);
      }
    } catch {
      // abaikan
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    setStudent(null);
    setTasks([]);
    setProgressDraft({});
    setError('');
    try {
      localStorage.removeItem('pa-murid');
    } catch {
      // abaikan
    }
  };

  const callPatch = async (id, body) => {
    const res = await fetch(`/api/student-tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: student.name, code, ...body }),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server error (${res.status}).`);
    }
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan.');
    setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
  };

  const toggleDone = async (t) => {
    setSavingId(t.id);
    setError('');
    try {
      await callPatch(t.id, { done: !t.done });
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  };

  const saveProgress = async (t) => {
    setSavingId(t.id);
    setError('');
    try {
      await callPatch(t.id, { progress: progressDraft[t.id] ?? t.progress ?? '' });
      setProgressDraft((prev) => {
        const next = { ...prev };
        delete next[t.id];
        return next;
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  };

  if (!student) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-white px-4 py-10 text-neutral-900 dark:bg-zinc-950 dark:text-neutral-100">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            <p className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 text-xl font-semibold text-white">
              ✦
            </p>
            <h1 className="text-xl font-semibold">Dashboard Murid</h1>
            <p className="pt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Masuk pakai nama dan kode unik dari coach untuk melihat jadwal, tugas konten, dan to-do kamu.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login();
            }}
            className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-zinc-900"
          >
            {error && (
              <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Nama</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="Nama lengkapmu"
                autoComplete="name"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Kode murid</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={20}
                placeholder="Mis. BUDI-7A3K"
                autoComplete="off"
                className={`${inputCls} font-mono`}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
          <p className="text-center text-xs text-neutral-400">
            Belum punya kode? Minta ke coach ya.
          </p>
        </div>
      </div>
    );
  }

  const groups = ['jadwal', 'konten', 'todo'].map((k) => ({
    kind: k,
    items: tasks.filter((t) => t.kind === k),
  }));
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 dark:bg-zinc-950 dark:text-neutral-100">
      <header className="flex items-center gap-2 border-b border-neutral-200 bg-white/70 px-4 py-3 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/40">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 text-sm font-semibold text-white">
          {student.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">Halo, {student.name}!</span>
          <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
            {student.class ? `${student.class} · ` : ''}{doneCount}/{tasks.length} tugas selesai
          </span>
        </span>
        <button
          onClick={() => login(student.name, code)}
          title="Muat ulang"
          className="rounded-full p-2 text-emerald-600 transition hover:bg-neutral-200 dark:text-emerald-400 dark:hover:bg-zinc-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 005.6 5.6L4 7m0 8a8 8 0 0014.4 3.4L20 17" />
          </svg>
        </button>
        <button
          onClick={logout}
          className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-zinc-800"
        >
          Keluar
        </button>
      </header>

      <main className="flex-1 px-4 pb-10">
        <div className="mx-auto w-full max-w-2xl space-y-4 pt-6">
          {error && (
            <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}
          {tasks.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">
              Belum ada jadwal atau tugas untukmu. Tanya coach kalau seharusnya sudah ada ya.
            </p>
          ) : (
            groups.map((g) => (
              <section key={g.kind} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-zinc-900">
                <h2 className="mb-3 text-sm font-semibold">{KIND_META[g.kind].label}</h2>
                {g.items.length === 0 ? (
                  <p className="text-sm text-neutral-500">Tidak ada.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {g.items.map((t) => (
                      <li key={t.id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={() => toggleDone(t)}
                            disabled={savingId === t.id}
                            aria-label={t.done ? 'Tandai belum selesai' : 'Tandai selesai'}
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                              t.done
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-neutral-300 hover:border-emerald-500 dark:border-neutral-700'
                            }`}
                          >
                            {t.done && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${t.done ? 'text-neutral-400 line-through' : 'font-medium'}`}>
                              {t.title}
                            </p>
                            <p className="text-[11px] text-neutral-400">{fmtTanggal(t.date)}</p>
                            {t.detail && (
                              <p className="whitespace-pre-wrap pt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                                {t.detail}
                              </p>
                            )}
                            <div className="pt-2">
                              <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                Progres saya
                              </label>
                              <textarea
                                value={progressDraft[t.id] ?? t.progress ?? ''}
                                onChange={(e) =>
                                  setProgressDraft((prev) => ({ ...prev, [t.id]: e.target.value.slice(0, 1000) }))
                                }
                                rows={2}
                                maxLength={1000}
                                placeholder="Tulis progresmu, mis. Sudah take 3 video, tinggal editing..."
                                className="w-full resize-y rounded-xl border border-neutral-200 bg-white p-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500 dark:border-neutral-800 dark:bg-zinc-950"
                              />
                              {(progressDraft[t.id] ?? '') !== (t.progress ?? '') && progressDraft[t.id] !== undefined && (
                                <button
                                  onClick={() => saveProgress(t)}
                                  disabled={savingId === t.id}
                                  className="mt-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
                                >
                                  {savingId === t.id ? 'Menyimpan...' : 'Kirim progres'}
                                </button>
                              )}
                              {t.done && t.done_at && (
                                <p className="pt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                                  Selesai ✓
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
