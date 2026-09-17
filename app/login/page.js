'use client';
import { useState } from 'react';
import { getSupabaseBrowser } from '@/app/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Aman saat env belum diisi: tampilkan peringatan, bukan crash.
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!isConfigured) {
      setError('Konfigurasi Supabase belum lengkap. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local.');
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Email atau password salah / akses tidak diizinkan.');
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#09090b] text-neutral-100 font-sans p-4">
      <div className="w-full max-w-sm p-6 bg-[#121215] border border-neutral-800 rounded-2xl shadow-xl space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-wide">Private Access</h1>
          <p className="text-xs text-neutral-400">Silakan login dengan akun murid yang telah terdaftar.</p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center">
            {error}
          </div>
        )}

        {!isConfigured && !error && (
          <div className="p-3 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-center">
            Konfigurasi Supabase belum lengkap. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local lalu restart server.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nama@email.com"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-neutral-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-100 text-neutral-950 font-medium text-sm py-3 rounded-xl hover:bg-white disabled:opacity-40 transition"
          >
            {loading ? 'Verifikasi...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
