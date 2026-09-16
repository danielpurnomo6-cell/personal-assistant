'use client';
import { useState } from 'react';

const inputCls =
  'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-violet-500 dark:border-neutral-800 dark:bg-zinc-950';

export default function IsiCatatan() {
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [content, setContent] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (sending) return;
    setError('');
    if (!name.trim() || !studentClass.trim() || !content.trim() || !code.trim()) {
      setError('Lengkapi semua kolom dulu ya: nama, kelas, catatan, dan kode kelas.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/student-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, class: studentClass, content, code }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}). Coba lagi ya.`);
      }
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim catatan.');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setContent('');
    setCode('');
    setSent(false);
    setError('');
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-4 py-10 text-neutral-900 dark:bg-zinc-950 dark:text-neutral-100">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center">
          <p className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 text-xl font-semibold text-white">
            ✎
          </p>
          <h1 className="text-xl font-semibold">Catatan untuk Coach</h1>
          <p className="pt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Tulis catatanmu di bawah ini. Otomatis masuk ke sistem coach.
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-3xl">✓</p>
            <h2 className="pt-2 text-base font-semibold text-emerald-700 dark:text-emerald-300">
              Terkirim, terima kasih {name.trim()}!
            </h2>
            <p className="pt-1 text-sm text-neutral-600 dark:text-neutral-300">
              Catatanmu sudah masuk dan akan dibaca coach.
            </p>
            <button
              onClick={reset}
              className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Kirim catatan lagi
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-zinc-900">
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
              <label className="mb-1 block text-sm font-medium">Kelas</label>
              <input
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                maxLength={50}
                placeholder="Mis. Kelas Content Batch 3"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Isi catatan <span className="font-normal text-neutral-400">({content.length}/2000)</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 2000))}
                rows={6}
                placeholder="Tulis progres, kendala, atau pertanyaanmu di sini..."
                className={`${inputCls} resize-y leading-relaxed`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Kode kelas</label>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Minta kode ke coach"
                autoComplete="off"
                className={inputCls}
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
            >
              {sending ? 'Mengirim...' : 'Kirim catatan'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-neutral-400">
          Catatan hanya dibaca oleh coach dan tidak disebarluaskan.
        </p>
      </div>
    </div>
  );
}
