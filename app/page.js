'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import PromptBar from './components/PromptBar';
import Message from './components/Message';
import LynnAI from './components/LynnAI';
import RavineBackground from './components/RavineBackground';
import DailyVerse from './components/DailyVerse';
import { loadChats, saveChats, loadTheme, saveTheme, createChat } from './lib/storage';
import { PROVIDERS } from './lib/models';

// Sapaan landing: acak setiap refresh, kalimat evening hanya sore/malam.
const GREETINGS_ANYTIME = [
  'Hey Daniel! Ready to turn some ideas into reality?',
  'Welcome back Daniel! How can I assist you with your projects today?',
  'Hi Daniel! Let\u2019s get things done. What shall we work on?',
  'Good to see you, Daniel! What\u2019s on your mind today?',
  'Hello Daniel! System\u2019s ready whenever you are. What\u2019s the focus?',
  'Hey Daniel! How can I make your workload lighter today?',
  'Welcome Daniel! Ready to crush today\u2019s goals together?',
];

const GREETINGS_EVENING = [
  'Good evening Daniel! What are we diving into tonight?',
  'Evening, Daniel! What\u2019s top priority on your list right now?',
  'Evening Daniel! Need help brainstorming, drafting, or troubleshooting?',
];

function greeting() {
  const h = new Date().getHours();
  const pool = h >= 15 ? [...GREETINGS_ANYTIME, ...GREETINGS_EVENING] : GREETINGS_ANYTIME;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Sapaan pertama tiap buka tab: berbasis waktu (Good morning/afternoon/evening/night Daniel).
function greetingTimeBased() {
  const h = new Date().getHours();
  const base =
    h < 11 ? 'Good morning' : h < 15 ? 'Good afternoon' : h < 19 ? 'Good evening' : 'Good night';
  return `${base} Daniel`;
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
  const [talking, setTalking] = useState(false);
  const talkingTimer = useRef(null);

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
      // Buka tab baru = sapaan waktu; refresh berikutnya = acak (flag per session).
      const seen = sessionStorage.getItem('pa-greet-first');
      if (seen) {
        setGreet(greeting());
      } else {
        setGreet(greetingTimeBased());
        sessionStorage.setItem('pa-greet-first', '1');
      }
    } catch {
      // pertahankan default 'Halo'
    }
    try {
      const e = localStorage.getItem('pa-effort');
      if (['low', 'medium', 'high'].includes(e)) setEffort(e);
    } catch {
      // pertahankan default 'medium'
    }
    try {
      const pid = localStorage.getItem('pa-provider');
      if (pid && PROVIDERS.some((x) => x.id === pid && x.available)) setProviderId(pid);
    } catch {
      // pertahankan default 'gemini'
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
    if (p && p.available) {
      setProviderId(id);
      try {
        localStorage.setItem('pa-provider', id);
      } catch {
        // abaikan
      }
    }
  };

  const activeChat = (chats || []).find((c) => c.id === activeId) || null;
  const messages = useMemo(
    () => ((chats || []).find((c) => c.id === activeId)?.messages || []),
    [chats, activeId]
  );
  const isLanding = messages.length === 0;

  // TALKING: aktif sesaat setelah pesan AI masuk agar blob terlihat "berbicara".
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant') {
      setTalking(true);
      if (talkingTimer.current) clearTimeout(talkingTimer.current);
      // Durasi elastis proporsional panjang jawaban (4–10 detik).
      const dur = Math.min(10000, Math.max(4000, (last.content?.length || 200) * 12));
      talkingTimer.current = setTimeout(() => setTalking(false), dur);
    }
    return () => {
      if (talkingTimer.current) clearTimeout(talkingTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // State blob: THINKING saat loading, TALKING sesaat setelah AI menjawab, IDLE selebihnya.
  const blobState = loading ? 'thinking' : talking ? 'talking' : 'idle';

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
      const selectedModel = PROVIDERS.find((x) => x.id === providerId)?.model;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated,
          timeInfo: getTimeInfo(),
          effort,
          providerId,
          selectedModel,
        }),
        signal: ctrl.signal,
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (res.status === 401) {
        appendAssistant(cid, `Akses ditolak (${res.status}). ${data.error || 'Coba lagi.'}`);
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
      <div className="flex h-screen items-center justify-center bg-white text-sm text-red-500 dark:bg-[#080203] dark:text-red-200/70">
        Menghubungkan ke LYNN...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white text-neutral-900 dark:bg-[#080203] dark:text-neutral-100">
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
        <header className="flex items-center gap-1 border-b border-red-200 bg-white/80 px-3 py-2.5 backdrop-blur-md dark:border-red-500/20 dark:bg-[#0a0304]/80">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Menu"
            className="rounded-full p-2 text-red-600 transition hover:bg-red-500/10 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
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
            className="rounded-full p-2 text-red-600 transition hover:bg-red-500/10 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
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
        </header>

        {isLanding ? (
          <main className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto bg-white px-4 pb-10 dark:bg-[#080203]">
            <RavineBackground className="absolute inset-0 h-full w-full opacity-40" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-white/60 to-white dark:from-[#080203]/70 dark:via-[#0a0304]/60 dark:to-[#080203]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,30,66,0.12),transparent_60%)]" />
            <div className="relative z-10 flex w-full flex-col items-center">
            <div className="mb-6">
              <LynnAI state={blobState} />
            </div>
            <h1 className="mb-6 bg-gradient-to-r from-red-600 via-[#ff1e42] to-red-500 bg-clip-text px-2 text-center text-xl font-medium text-transparent sm:text-[26px] dark:from-red-200 dark:via-[#ff1e42] dark:to-red-500">
              {greet}
            </h1>
            <div className="w-full max-w-2xl rounded-full border border-red-200 bg-white/70 p-1 shadow-[0_0_40px_rgba(255,30,66,0.12)] backdrop-blur-md dark:border-red-500/20 dark:bg-[#0a0304]/60">
              <PromptBar
                onSend={(t) => send(t)}
                loading={loading}
                onStop={stop}
                providerId={providerId}
                effort={effort}
                onProviderChange={changeProvider}
                onEffortChange={changeEffort}
                placeholder="Ask Lynn..."
              />
            </div>
            <div className="mt-6 w-full max-w-2xl">
              <DailyVerse />
            </div>
            </div>
          </main>
        ) : (
          <>
            <main className="flex-1 overflow-y-auto bg-white px-4 py-6 dark:bg-[#080203]">
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
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#ff1e42]/50 bg-gradient-to-br from-red-900 via-[#ff1e42] to-red-500 shadow-[0_0_16px_rgba(255,30,66,0.5)]">
                      <span className="h-2 w-2 rounded-full bg-white animate-lynn-blink" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl border border-red-500/20 bg-red-500/5 px-3 py-2">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-[#ff1e42] [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-[#ff1e42] [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-[#ff1e42] [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            </main>
            <footer className="border-t border-red-200 bg-white px-4 pb-4 pt-3 dark:border-red-500/20 dark:bg-[#0a0304]">
              <div className="mx-auto max-w-3xl space-y-2 rounded-full border border-red-200 bg-white/70 p-1 shadow-[0_0_30px_rgba(255,30,66,0.1)] dark:border-red-500/20 dark:bg-[#0a0304]/60">
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
