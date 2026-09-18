'use client';

// LYNN Core Arc — lingkaran HUD futuristik Crimson (murni SVG + CSS, tanpa dependensi).
// Props: size (tailwind h/w), state: 'idle' | 'loading' (loading = putaran & pulse lebih intens).
export default function LynnCore({ size = 'h-28 w-28', state = 'idle' }) {
  const busy = state === 'loading';
  return (
    <div className={`relative ${size} animate-lynn-float`} role="img" aria-label="LYNN core online">
      {/* Glow luar crimson */}
      <div className="absolute -inset-6 rounded-full bg-red-600/30 blur-2xl animate-lynn-pulse dark:bg-[#ff1e42]/25" />
      <div className="absolute -inset-2 rounded-full bg-red-500/20 blur-xl animate-lynn-pulse-delay" />

      {/* Ring HUD */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="lynnCoreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff1e42" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#ef4444" stopOpacity="0.75" />
            <stop offset="75%" stopColor="#7f1d1d" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#080203" stopOpacity="1" />
          </radialGradient>
        </defs>

        {/* Lingkaran luar putus-putus */}
        <g className={busy ? 'animate-lynn-spin-fast origin-center' : 'animate-lynn-spin-slow origin-center'} style={{ transformOrigin: '100px 100px' }}>
          <circle cx="100" cy="100" r="94" fill="none" stroke="#ef4444" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 7" />
          <circle cx="100" cy="100" r="82" fill="none" stroke="#ff1e42" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="48 26" strokeLinecap="round" />
        </g>

        {/* Arc dalam berlawanan arah */}
        <g className="animate-lynn-spin-reverse origin-center" style={{ transformOrigin: '100px 100px' }}>
          <circle cx="100" cy="100" r="68" fill="none" stroke="#ef4444" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 5" />
          <circle cx="100" cy="100" r="68" fill="none" stroke="#ff6b81" strokeOpacity="0.8" strokeWidth="2.5" strokeDasharray="18 120" strokeLinecap="round" />
        </g>

        {/* Tick kardinal */}
        <g stroke="#ff1e42" strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round">
          <line x1="100" y1="2" x2="100" y2="10" />
          <line x1="100" y1="190" x2="100" y2="198" />
          <line x1="2" y1="100" x2="10" y2="100" />
          <line x1="190" y1="100" x2="198" y2="100" />
        </g>

        {/* Inti */}
        <circle cx="100" cy="100" r="46" fill="url(#lynnCoreGrad)" />
        <circle cx="100" cy="100" r="46" fill="none" stroke="#ff1e42" strokeOpacity="0.6" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="30" fill="none" stroke="#fecdd3" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 4" />
        <circle cx="100" cy="100" r="12" fill="#fff1f2" className="animate-lynn-core" />
      </svg>

      {/* Kilau */}
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.35),transparent_45%)]" />
    </div>
  );
}
