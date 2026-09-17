'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import PromptBar from './components/PromptBar';
import Message from './components/Message';
import AiBlob from './components/AiBlob';
import RavineBackground from './components/RavineBackground';
import DailyVerse from './components/DailyVerse';
import { loadChats, saveChats, loadTheme, saveTheme, createChat } from './lib/storage';
import { PROVIDERS } from './lib/models';
import { owner } from './lib/owner';
import { getSupabaseBrowser } from './lib/supabase/client';
import { useRouter } from 'next/navigation';

function greeting() {
  const firstName = (owner.name || '').split(' ')[0] || '';
  const h = new Date().getHours();
  const base =
    h < 11 ? 'Good morning' : h < 15 ? 'Good afternoon' : h < 19 ? 'Good evening' : 'Good night';
  return firstName ? `${base} ${firstName}` : base;
}

// Info waktu lokal user (Bahasa Inggris) untuk dikirim ke AI.
function getTimeInfo() {
  const now = new Date();
  const h = now.getHours();
  const period =
    h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 15 ? 'afternoon' : h >= 15 && h < 19 ? 'evening' : 'night';
  const pad = (n) => String(n).padStart(2, '0');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return {
    day: days[now.getDay()],
    date: `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`,
    time: `${pad(h)}:${pad(now.getMinutes())}`,
    period,
  };
}

export default function PersonalAssistant() {
  const router = useRouter();
  // Nilai awal KONSTAN agar render server & hydration pertama identik
  // (tidak ada hydration mismatch). Nilai persisten dari localStorage
  // dimuat sekali di efek mount di bawah.
  const [chats, setChats] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [greet, setGreet] = useState('Halo');
  const [providerId, setProviderId] = useState('gemini');
  const [effort, setEffort] = useState('medium');
  const abortRef = useRef(null);
  const endRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Muat state persisten (localStorage) sekali setelah mount.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- muat sekali dari localStorage setelah mount */
    try {
      setChats(loadChats());
    } catch {
      setChats([]);
    }
    try {
      setTheme(loadTheme());
    } catch {
      // pertahankan default 'dark'
    }
    try {
      setGreet(greeting());
    } catch {
      // pertahankan default 'Halo'
    }
    try {
      const e = localStorage.getItem('pa-effort');
      if (['low', 'medium', 'high'].includes(e)) setEffort(e);
    } catch {
      // pertahankan default 'medium'
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    let cancel = false;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/student-notes?count=unread');
        const data = await res.json().catch(() => ({}));
        if (!cancel && res.ok && typeof data.unread === 'number') {
          setUnreadCount(data.unread);
        }
      } catch {
        // abaikan — badge unread tidak kritis
      }
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 60000);
    return () => {
      cancel = true;
      clearInterval(t);
    };
  }, []);


  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (chats !== null) saveChats(chats);
  }, [chats]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    saveTheme(next);
  };

  const handleLogout = async () => {
    try {
      await getSupabaseBrowser().auth.signOut();
    } catch {
      // abaikan — tetap arahkan ke login
    }
    router.push('/login');
    router.refresh();
  };

  const changeEffort = (v) => {
    if (!['low', 'medium', 'high'].includes(v)) return;
    setEffort(v);
    try {
      localStorage.setItem('pa-effort', v);
    } catch {
      // abaikan
    }
  };

  const changeProvider = (id) => {
    const p = PROVIDERS.find((x) => x.id === id);
    if (p && p.available) setProviderId(id);
  };

  const activeChat = (chats || []).find((c) => c.id === activeId) || null;
  const messages = useMemo(
    () => ((chats || []).find((c) => c.id === activeId)?.messages || []),
    [chats, activeId]
  );
  const isLanding = messages.length === 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, activeId]);

  const appendAssistant = (chatId, content) => {
    const m = { role: 'assistant', content, ts: Date.now() };
    setChats((prev) =>
      (prev || []).map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, m], updatedAt: Date.now() }
          : c
      )
    );
  };

  const send = async (text, baseOverride, chatIdOverride) => {
    const content = (text || '').trim();
    if (!content || loading) return;

    let cid = chatIdOverride ?? activeId;
    let base = baseOverride ?? messages;
    if (!cid) {
      const nc = createChat();
      cid = nc.id;
      base = [];
      setChats((prev) => [nc, ...(prev || [])]);
      setActiveId(cid);
    }

    const userMsg = { role: 'user', content, ts: Date.now() };
    const updated = [...base, userMsg];
    setChats((prev) =>
      (prev || []).map((c) =>
        c.id === cid
          ? {
              ...c,
              title: base.length === 0 ? content.slice(0, 42) : c.title,
              messages: updated,
              updatedAt: Date.now(),
            }
          : c
      )
    );

    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, timeInfo: getTimeInfo(), effort }),
        signal: ctrl.signal,
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (res.status === 401) {
        router.push('/login');
        router.refresh();
        return;
      }
      if (!res.ok && !data.error && !data.text) {
        appendAssistant(cid, `Server error (${res.status}). Coba lagi sebentar.`);
      } else {
        appendAssistant(cid, data.text || data.error || 'Gagal mendapatkan balasan.');
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      appendAssistant(cid, 'Terjadi masalah koneksi.');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    try {
      abortRef.current?.abort();
    } catch {
      // abaikan
    }
  };

  const regenerate = async () => {
    if (loading || !activeChat || messages.length === 0) return;
    const idx = activeChat.messages.map((m) => m.role).lastIndexOf('user');
    if (idx < 0) return;
    const base = activeChat.messages.slice(0, idx);
    const text = activeChat.messages[idx].content;
    setChats((prev) =>
      (prev || []).map((c) => (c.id === activeChat.id ? { ...c, messages: base } : c))
    );
    await send(text, base, activeChat.id);
  };

  const newChatBtn = () => {
    setActiveId(null);
    if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false);
  };

  const selectChat = (id) => {
    setActiveId(id);
    if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false);
  };

  const deleteChat = (id) => {
    setChats((prev) => (prev || []).filter((c) => c.id !== id));
    if (id === activeId) setActiveId(null);
  };

  if (chats === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-sm text-neutral-500 dark:bg-zinc-950 dark:text-neutral-400">
        Memuat...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white text-neutral-900 dark:bg-zinc-950 dark:text-neutral-100">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chats}
        activeId={activeId}
        onSelect={selectChat}
        onNew={newChatBtn}
        onDelete={deleteChat}
        unreadCount={unreadCount}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-1 border-b border-neutral-200 bg-white/70 px-3 py-2.5 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/40">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Menu"
            className="rounded-full p-2 text-blue-600 transition hover:bg-neutral-200 dark:text-blue-400 dark:hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            className="rounded-full p-2 text-blue-600 transition hover:bg-neutral-200 dark:text-blue-400 dark:hover:bg-zinc-800"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <circle cx="12" cy="12" r="4" />
                <path strokeLinecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
              </svg>
            )}
          </button>
          <button
            onClick={newChatBtn}
            aria-label="Chat baru"
            title="Chat baru"
            className="rounded-full p-1.5 text-blue-600 transition hover:bg-neutral-200 dark:text-blue-400 dark:hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
            className="rounded-full px-2.5 py-1.5 text-xs text-neutral-400 transition hover:bg-neutral-200 hover:text-red-500 dark:hover:bg-zinc-800 dark:hover:text-red-400"
          >
            Logout
          </button>
        </header>

        {isLanding ? (
          <main className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-10">
            <RavineBackground className="absolute inset-0 h-full w-full opacity-70 dark:opacity-80" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 via-white/30 to-white dark:from-zinc-950/85 dark:via-zinc-950/60 dark:to-zinc-950" />
            <div className="relative z-10 flex w-full flex-col items-center">
            <div className="mb-6">
              <AiBlob />
            </div>
            <h1 className="mb-6 bg-gradient-to-r from-blue-500 via-violet-500 to-rose-400 bg-clip-text px-2 text-center text-2xl font-medium text-transparent sm:text-3xl dark:from-blue-400 dark:via-violet-400 dark:to-rose-300">
              {greet}, how can I help you today?
            </h1>
            <div className="w-full max-w-2xl">
              <PromptBar
                onSend={(t) => send(t)}
                loading={loading}
                onStop={stop}
                providerId={providerId}
                effort={effort}
                onProviderChange={changeProvider}
                onEffortChange={changeEffort}
                placeholder="Ask anything..."
              />
            </div>
            <div className="mt-6 w-full max-w-2xl">
              <DailyVerse />
            </div>
            </div>
          </main>
        ) : (
          <>
            <main className="flex-1 overflow-y-auto px-4 py-6">
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((m, i) => (
                  <Message
                    key={`${activeId}-${i}`}
                    msg={m}
                    isLastAssistant={m.role === 'assistant' && i === messages.length - 1}
                    onRegenerate={regenerate}
                    loading={loading}
                  />
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500">
                      <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4">
                        <path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl px-1 py-2">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:0ms] dark:bg-blue-400" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:150ms] dark:bg-blue-400" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:300ms] dark:bg-blue-400" />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            </main>
            <footer className="px-4 pb-4">
              <div className="mx-auto max-w-3xl space-y-2">
                <PromptBar
                  onSend={(t) => send(t)}
                  loading={loading}
                  onStop={stop}
                  providerId={providerId}
                  effort={effort}
                  onProviderChange={changeProvider}
                  onEffortChange={changeEffort}
                />
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
