'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CalendarWidget from './CalendarWidget';

const CALENDAR_TAG = /\[CALENDAR:(\d{4})-(\d{2})\]/;

function fmtTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const mdComponents = {
  p: (props) => <p className="mb-3 last:mb-0" {...props} />,
  h1: (props) => <h1 className="mb-2 mt-4 text-lg font-semibold first:mt-0" {...props} />,
  h2: (props) => <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0" {...props} />,
  h3: (props) => <h3 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0" {...props} />,
  ul: (props) => <ul className="mb-3 list-disc space-y-1.5 pl-5" {...props} />,
  ol: (props) => <ol className="mb-3 list-decimal space-y-1.5 pl-5" {...props} />,
  li: (props) => <li className="leading-[1.75]" {...props} />,
  a: (props) => (
    <a className="text-red-400 underline hover:text-red-300" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  blockquote: (props) => (
    <blockquote className="mb-2 border-l-2 border-neutral-300 pl-3 italic text-neutral-600 dark:border-neutral-600 dark:text-neutral-400" {...props} />
  ),
  pre: (props) => (
    <pre className="mb-2 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-100 p-3 text-[13px] leading-relaxed dark:border-neutral-800 dark:bg-zinc-900" {...props} />
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = (className || '').includes('language-');
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-neutral-200/80 px-1 py-0.5 text-[13px] dark:bg-zinc-800" {...props}>
        {children}
      </code>
    );
  },
  table: (props) => (
    <table className="mb-2 block overflow-x-auto text-sm" {...props} />
  ),
  th: (props) => (
    <th className="border border-neutral-300 px-2 py-1 text-left font-semibold dark:border-neutral-700" {...props} />
  ),
  td: (props) => <td className="border border-neutral-300 px-2 py-1 dark:border-neutral-700" {...props} />,
  hr: (props) => <hr className="my-3 border-neutral-200 dark:border-neutral-800" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
};

export default function Message({ msg, isLastAssistant, onRegenerate, loading }) {
  const [copied, setCopied] = useState(false);

  const rawContent = String(msg?.content ?? '');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rawContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard tidak tersedia
    }
  };

  const calMatch = rawContent.match(CALENDAR_TAG);
  const calMonth = calMatch ? parseInt(calMatch[2], 10) : 0;
  const cal =
    calMatch && calMonth >= 1 && calMonth <= 12
      ? { year: parseInt(calMatch[1], 10), month: calMonth }
      : null;
  const text = calMatch ? rawContent.replace(CALENDAR_TAG, '').trim() : rawContent;

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%]">
          <div className="whitespace-pre-wrap rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-50 shadow-[0_0_20px_rgba(255,30,66,0.08)]">
            {rawContent}
          </div>
          {msg.ts && (
            <p className="mt-1 text-right text-[11px] text-neutral-400 dark:text-neutral-500">
              {fmtTime(msg.ts)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#ff1e42]/50 bg-gradient-to-br from-red-950 via-[#ff1e42] to-red-500 shadow-[0_0_14px_rgba(255,30,66,0.5)]">
        <span className="h-2 w-2 rounded-full bg-white animate-lynn-blink" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-[1.75] text-neutral-200">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {text}
          </ReactMarkdown>
        </div>
        {cal && (
          <div className="max-w-xs pt-2">
            <CalendarWidget
              key={`${cal.year}-${cal.month}`}
              initialYear={cal.year}
              initialMonth={cal.month - 1}
            />
          </div>
        )}
        <div className="mt-1 flex items-center gap-1">
          {msg.ts && (
            <span className="mr-1 text-[11px] text-neutral-400 dark:text-neutral-500">
              {fmtTime(msg.ts)}
            </span>
          )}
          <button
            onClick={copy}
            aria-label="Salin jawaban"
            title={copied ? 'Tersalin!' : 'Salin jawaban'}
            className="rounded p-1.5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            {copied ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-red-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path strokeLinecap="round" d="M5 15V5a2 2 0 012-2h10" />
              </svg>
            )}
          </button>
          {isLastAssistant && !loading && (
            <button
              onClick={onRegenerate}
              aria-label="Buat ulang jawaban"
              title="Buat ulang jawaban"
              className="rounded p-1.5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 005.6 5.6L4 7m0 8a8 8 0 0014.4 3.4L20 17" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
