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
        className={`z-40 flex w-72 shrink-0 flex-col border-r border-red-500/20 bg-[#0a0304] text-neutral-200 transition-transform duration-200 fixed inset-y-0 left-0 md:static ${
          open ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        <div className="flex items-center gap-2 p-3">
          <span className="flex min-w-0 flex-1 items-center gap-2 px-1 text-[15px] font-medium">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#ff1e42] shadow-[0_0_8px_rgba(255,30,66,0.9)] animate-lynn-blink" />
            <span className="truncate tracking-[0.15em] text-red-100">LYNN</span>
          </span>
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="rounded-full p-2 text-red-400 transition hover:bg-red-500/10 md:hidden"
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
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'border-red-500/30 bg-red-500/10 text-red-200 shadow-[0_0_16px_rgba(255,30,66,0.15)]'
                    : 'border-transparent text-neutral-300 hover:border-red-500/20 hover:bg-red-500/5'
                }`}
              >
                <span className={active ? 'text-red-400' : 'text-neutral-500'}>
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari chat"
              className="w-full rounded-xl border border-red-500/20 bg-red-500/5 py-2 pl-9 pr-3 text-sm text-red-50 outline-none placeholder:text-red-200/30 focus:border-[#ff1e42]/50"
            />
          </div>
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={() => {
              onNew?.();
              closeOnMobile();
            }}
            className="flex w-full items-center gap-2 rounded-lg border border-[#ef4444]/40 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:border-[#ff1e42] hover:bg-red-500/15 hover:shadow-[0_0_16px_rgba(255,30,66,0.25)]"
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
              className={`group flex items-center gap-1 rounded-xl border px-2 py-2 text-sm transition ${
                c.id === activeId
                  ? 'border-red-500/30 bg-red-500/10'
                  : 'border-transparent hover:border-red-500/20 hover:bg-red-500/5'
              }`}
            >
              <button onClick={() => onSelect(c.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate">{c.title || 'Chat baru'}</span>
                <span className="block text-xs text-neutral-500">{fmtTime(c.updatedAt)}</span>
              </button>
              <button
                onClick={() => onDelete(c.id)}
                aria-label="Hapus chat"
                className="hidden rounded p-1.5 text-red-400/60 transition hover:text-red-300 group-hover:block"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 4h4m-7 3l1 13h8l1-13" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Tentang — pinned di bawah */}
        <div className="border-t border-red-500/20 p-3">
          <Link
            href="/tentang"
            onClick={closeOnMobile}
            className={`flex items-center gap-3 rounded-xl border p-2 transition ${
              pathname === '/tentang'
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-transparent hover:border-red-500/20 hover:bg-red-500/5'
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
