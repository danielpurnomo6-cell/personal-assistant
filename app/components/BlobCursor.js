'use client';
import { useEffect, useRef } from 'react';

// Kursor blob glow navy: satu blob mengikuti mouse dengan efek lerp halus.
// Dekoratif saja (native cursor tetap ada, pointer-events none).
// Mati total di layar sentuh & prefers-reduced-motion. Hemat: rAF + transform saja.
export default function BlobCursor() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    if (window.matchMedia?.('(pointer: fine)')?.matches !== true) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true) return;

    let tx = -100;
    let ty = -100;
    let x = -100;
    let y = -100;
    let scale = 1;
    let tScale = 1;
    let raf = 0;
    let shown = false;

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        shown = true;
        el.style.opacity = '1';
      }
    };
    const onDown = () => {
      tScale = 0.72;
    };
    const onUp = () => {
      tScale = 1;
    };
    const loop = () => {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      scale += (tScale - scale) * 0.2;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[70] opacity-0 transition-opacity duration-300"
    >
      <div className="absolute -inset-3 rounded-full bg-blue-600/25 blur-xl" />
      <div className="h-7 w-7 animate-blob-morph bg-[conic-gradient(from_180deg_at_50%_50%,#0a1128,#1e3a8a,#2563eb,#1e1b4b,#0a1128)] opacity-90" />
    </div>
  );
}
