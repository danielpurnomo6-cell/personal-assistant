'use client';

// AI Blob custom (tanpa React Bits Pro):
// blob animated bernuansa navy-blue dengan glow, murni CSS (tanpa dependensi).
export default function AiBlob({ size = 'h-20 w-20', iconSize = 'h-8 w-8' }) {
  return (
    <div className={`relative ${size} animate-blob-float`}>
      {/* Glow luar */}
      <div className="absolute -inset-6 rounded-full bg-blue-700/40 blur-2xl animate-blob-glow dark:bg-blue-500/40" />
      <div className="absolute -inset-2 rounded-full bg-indigo-500/30 blur-xl animate-blob-glow-delay dark:bg-indigo-400/30" />

      {/* Badan blob */}
      <div className="absolute inset-0 overflow-hidden animate-blob-morph bg-[conic-gradient(from_180deg_at_50%_50%,#0a1128,#1e3a8a,#2563eb,#1e1b4b,#0a1128)] shadow-[inset_-8px_-10px_24px_rgba(0,0,0,0.55),inset_8px_10px_24px_rgba(147,197,253,0.35)]">
        {/* Highlight berputar (terpotong mengikuti bentuk blob) */}
        <div className="absolute -left-1/2 -top-1/2 h-[200%] w-[200%] animate-blob-spin-slow bg-[radial-gradient(circle_at_35%_30%,rgba(191,219,254,0.55),transparent_45%)]" />
        {/* Kilau bawah */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(129,140,248,0.35),transparent_50%)]" />
      </div>

      {/* Ikon sparkle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="white" className={`${iconSize} drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]`}>
          <path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2z" />
        </svg>
      </div>
    </div>
  );
}
