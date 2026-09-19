'use client';
import { useEffect, useRef, useState } from 'react';
import ModelPicker from './ModelPicker';

const MAX_FILE_CHARS = 20000;

// Prompt bar ala Gemini: bentuk pil roundshape, tombol +, mic + nama AI di kanan.
// Kirim via Enter — tombol kirim/stop sengaja dihapus sesuai permintaan.
export default function PromptBar({ onSend, loading, onStop, providerId, effort, onProviderChange, onEffortChange, placeholder = 'Ask Lynn...' }) {
  void onStop;
  const [input, setInput] = useState('');
  const [attached, setAttached] = useState([]);
  const [listening, setListening] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const recRef = useRef(null);

  const SR =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  // Auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Matikan mic saat unmount
  useEffect(
    () => () => {
      try {
        recRef.current?.abort();
      } catch {
        // abaikan
      }
    },
    []
  );

  const canSend = !loading && (input.trim().length > 0 || attached.length > 0);

  const doSend = () => {
    if (!canSend) return;
    const parts = [];
    if (input.trim()) parts.push(input.trim());
    attached.forEach((f) => parts.push(`[Lampiran: ${f.name}]\n${f.content}`));
    onSend(parts.join('\n\n'));
    setInput('');
    setAttached([]);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  const attachFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      let text = await file.text();
      if (text.length > MAX_FILE_CHARS) {
        text = text.slice(0, MAX_FILE_CHARS) + '\n...[dipotong]';
      }
      setAttached((prev) => [...prev, { name: file.name, content: text }]);
    } catch {
      // abaikan file yang gagal dibaca
    }
  };

  const toggleMic = () => {
    if (!SR) return;
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {
        // abaikan
      }
      return;
    }
    const rec = new SR();
    recRef.current = rec;
    rec.lang = 'id-ID';
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const last = ev.results[ev.results.length - 1];
      const transcript = last?.[0]?.transcript || '';
      if (transcript) setInput((prev) => (prev ? prev + ' ' : '') + transcript.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <div className="rounded-full border border-red-200 bg-white/80 shadow-[0_0_24px_rgba(255,30,66,0.08)] backdrop-blur-md transition focus-within:border-[#ff1e42]/60 focus-within:shadow-[0_0_24px_rgba(255,30,66,0.2)] dark:border-red-500/20 dark:bg-[#0a0304]/80">
      {attached.length > 0 && (
        <div className="flex flex-wrap gap-2 px-6 pt-3">
          {attached.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="flex items-center gap-1.5 rounded-full bg-neutral-200 py-1 pl-3 pr-1.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              <span className="max-w-[180px] truncate">{f.name}</span>
              <button
                onClick={() => setAttached((prev) => prev.filter((_, j) => j !== i))}
                aria-label={`Hapus ${f.name}`}
                className="rounded-full p-0.5 hover:bg-neutral-300 dark:hover:bg-neutral-700"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Satu baris ala Gemini: [+] [Ask Lynn...] [Nama AI] [mic] */}
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Lampirkan file teks"
          title="Lampirkan file teks"
          className="shrink-0 rounded-full p-2.5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.json,.csv,.js,.ts,.py,.html,.css,.xml"
          onChange={attachFile}
          className="hidden"
        />

        <textarea
          ref={taRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="max-h-[200px] min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-red-50 dark:placeholder:text-red-200/30"
        />

        <ModelPicker
          providerId={providerId}
          effort={effort}
          onProviderChange={onProviderChange}
          onEffortChange={onEffortChange}
          open={pickerOpen}
          onToggle={() => setPickerOpen((v) => !v)}
          onClose={() => setPickerOpen(false)}
        />

        {SR && (
          <button
            onClick={toggleMic}
            aria-label={listening ? 'Berhenti mendengarkan' : 'Input suara'}
            title={listening ? 'Berhenti mendengarkan' : 'Input suara'}
            className={`shrink-0 rounded-full p-2.5 transition ${
              listening
                ? 'bg-red-500/15 text-red-300 animate-pulse'
                : 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path strokeLinecap="round" d="M5 11a7 7 0 0014 0M12 18v3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
