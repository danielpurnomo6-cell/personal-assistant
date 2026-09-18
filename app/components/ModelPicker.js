'use client';
import { useEffect } from 'react';
import { PROVIDERS, EFFORT_LEVELS } from '../lib/models';

// Composer model picker ala AI Chat 9:
// daftar provider + kartu detail (konteks, biaya) + kontrol reasoning effort.
export default function ModelPicker({ providerId, effort, onProviderChange, onEffortChange, open, onToggle, onClose }) {
  const active = PROVIDERS.find((p) => p.id === providerId) || PROVIDERS[0];
  const activeEffort = EFFORT_LEVELS.find((e) => e.id === effort) || EFFORT_LEVELS[1];

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-label="Pilih model"
        title="Pilih model"
        className="ml-1 flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-neutral-500 transition hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
      >
        <span className="h-2 w-2 rounded-full bg-gradient-to-br from-red-900 via-[#ff1e42] to-red-400 shadow-[0_0_8px_rgba(255,30,66,0.7)]" />
        <span className="hidden max-w-[140px] truncate sm:block">{active.model}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
          <div className="absolute bottom-full left-0 z-50 mb-2 max-h-[min(60vh,360px)] w-[260px] max-w-[calc(100vw-3rem)] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <p className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              Model
            </p>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                disabled={!p.available}
                title={p.available ? p.desc : p.costNote}
                onClick={() => {
                  onProviderChange?.(p.id);
                  onClose?.();
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition ${
                  p.available
                    ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    : 'cursor-not-allowed opacity-55'
                } ${p.id === active.id ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-900 via-[#ff1e42] to-red-500 text-xs font-semibold text-white">
                  {p.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block truncate font-mono text-[11px] text-neutral-500">
                    {p.available ? p.model : 'Segera hadir'}
                  </span>
                </span>
                {p.id === active.id ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 shrink-0 text-red-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  !p.available && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-neutral-400">
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path strokeLinecap="round" d="M8 11V8a4 4 0 018 0v3" />
                    </svg>
                  )
                )}
              </button>
            ))}

            <div className="mx-2 my-2 border-t border-neutral-200 dark:border-neutral-700" />

            <div className="rounded-xl bg-neutral-100 px-2.5 py-2 dark:bg-neutral-800/70">
              <p className="pb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Detail model
              </p>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">Konteks</dt>
                  <dd className="font-medium">{active.context}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">Output maks</dt>
                  <dd className="font-medium">{active.output}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">Biaya input / 1M</dt>
                  <dd className="font-medium">{active.costInput}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">Biaya output / 1M</dt>
                  <dd className="font-medium">{active.costOutput}</dd>
                </div>
              </dl>
              <p className="pt-1.5 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
                {active.costNote}
              </p>
            </div>

            {active.supportsEffort && (
              <div className="px-1 pb-1 pt-2">
                <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Reasoning effort
                </p>
                <div className="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800/70">
                  {EFFORT_LEVELS.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onEffortChange?.(e.id)}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                        e.id === activeEffort.id
                          ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100'
                          : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
                <p className="px-2 pt-1.5 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
                  {activeEffort.desc}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
