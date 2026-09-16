'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { owner, ownerInitials } from '../lib/owner';

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const ICON_CLS = 'h-5 w-5 shrink-0';

const NAV = [
  {
    href: '/',
    label: 'Chat',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={ICON_CLS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z" />
      </svg>
    ),
  },
  {
    href: '/catatan',
    label: 'Catatan',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={ICON_CLS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h8l4 4v14H7zM15 3v4h4M10 13h5M10 17h5" />
      </svg>
    ),
  },
  {
    href: '/kalender',
    label: 'Kalender',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={ICON_CLS}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
];

export default function Sidebar({
  open,
  onClose,
  chats,
  activeId,
  onSelect,
  onNew,
  onDelete,
  unreadCount = 0,
}) {
  const [q, setQ] = useState('');
  const pathname = usePathname();
  const query = q.trim().toLowerCase();
  const filtered = (chats || []).filter((c) =>
    (c.title || '').toLowerCase().includes(query)
  );
  const hasUnread = Number(unreadCount) > 0;

  const closeOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) onClose();
  };

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}
      <aside
        className={`z-40 flex w-72 shrink-0 flex-col border-r border-neutral-200 bg-white text-neutral-800 transition-transform duration-200 dark:border-neutral-800 dark:bg-zinc-950 dark:text-neutral-200 fixed inset-y-0 left-0 md:static ${
          open ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        <div className="flex items-center gap-2 p-3">
          <span className="flex min-w-0 flex-1 items-center gap-2 px-1 text-[15px] font-medium">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400">
              <path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2z" />
            </svg>
            <span className="truncate">Personal Assistant</span>
          </span>
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="rounded-full p-2 text-blue-600 transition hover:bg-neutral-200 md:hidden dark:text-blue-400 dark:hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Navigasi utama */}
        <nav className="space-y-1 px-3 pb-2">
          {NAV.map((l) => {
            const active = pathname === l.href;
            const showBadge = l.href === '/catatan' && hasUnread;
            const showDot = l.href === '/kalender' && hasUnread;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={closeOnMobile}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-blue-600/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                    : 'text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-zinc-900/70'
                }`}
              >
                <span className={active ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-400 dark:text-neutral-500'}>
                  {l.icon}
                </span>
                <span className="flex-1">{l.label}</span>
                {showBadge && (
                  <span
                    title={`${unreadCount} catatan murid belum dibaca`}
                    className="min-w-5 rounded-full bg-violet-600 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {showDot && (
                  <span title="Ada catatan murid belum dibaca" className="h-2 w-2 rounded-full bg-violet-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-2">
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500 dark:text-blue-400">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari chat"
              className="w-full rounded-xl bg-neutral-200/70 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-neutral-500 focus:ring-1 focus:ring-neutral-400 dark:bg-zinc-900 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-700"
            />
          </div>
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={() => {
              onNew?.();
              closeOnMobile();
            }}
            className="flex w-full items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-neutral-200 dark:border-neutral-800 dark:text-blue-300 dark:hover:bg-zinc-900"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
            Chat baru
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <p className="px-2 pb-1 pt-2 text-xs font-medium text-neutral-500">Riwayat</p>
          {filtered.length === 0 && (
            <p className="px-2 py-4 text-sm text-neutral-500">
              {query ? 'Tidak ada chat yang cocok.' : 'Belum ada chat tersimpan.'}
            </p>
          )}
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-1 rounded-xl px-2 py-2 text-sm transition ${
                c.id === activeId
                  ? 'bg-neutral-200 dark:bg-zinc-800'
                  : 'hover:bg-neutral-200/70 dark:hover:bg-zinc-900/70'
              }`}
            >
              <button onClick={() => onSelect(c.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate">{c.title || 'Chat baru'}</span>
                <span className="block text-xs text-neutral-500">{fmtTime(c.updatedAt)}</span>
              </button>
              <button
                onClick={() => onDelete(c.id)}
                aria-label="Hapus chat"
                className="hidden rounded p-1.5 text-blue-600/60 transition hover:text-blue-600 group-hover:block dark:text-blue-400/70 dark:hover:text-blue-400"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 4h4m-7 3l1 13h8l1-13" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Tentang — pinned di bawah */}
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <Link
            href="/tentang"
            onClick={closeOnMobile}
            className={`flex items-center gap-3 rounded-xl p-2 transition ${
              pathname === '/tentang'
                ? 'bg-blue-600/10 dark:bg-blue-500/15'
                : 'hover:bg-neutral-200/70 dark:hover:bg-zinc-900/70'
            }`}
          >
            {owner.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={owner.photo}
                alt={owner.name}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 text-sm font-semibold text-white">
                {ownerInitials()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{owner.name}</span>
              <span className="block text-xs text-neutral-500">Kenali saya</span>
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-neutral-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <p className="px-2 pt-2 text-[11px] leading-relaxed text-neutral-500">
            Riwayat tersimpan otomatis di browser ini.
          </p>
        </div>
      </aside>
    </>
  );
}
