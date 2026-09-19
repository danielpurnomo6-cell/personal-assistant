'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Target animasi per state percakapan.
const TARGETS = {
  idle: {
    speed: 0.7, // gelombang pelan & halus
    amp: 0.12, // noise distortion lembut
    freq: 1.1,
    pulseSpeed: 1.4,
    pulseAmp: 0.03,
    emissive: 0.55,
    light: 1.4,
    scaleBase: 1.0,
  },
  thinking: {
    speed: 3.4, // gelombang cepat saat loading
    amp: 0.27,
    freq: 1.7,
    pulseSpeed: 5.0, // breathing / pulse cepat
    pulseAmp: 0.09,
    emissive: 1.35,
    light: 3.2,
    scaleBase: 1.05,
  },
  talking: {
    speed: 2.2, // elastis & dinamis mengikuti respon
    amp: 0.36,
    freq: 2.4,
    pulseSpeed: 2.8,
    pulseAmp: 0.06,
    emissive: 0.95,
    light: 2.2,
    scaleBase: 1.0,
  },
};

function normalizeState(s) {
  if (s === 'loading' || s === 'thinking' || s === 'THINKING') return 'thinking';
  if (s === 'talking' || s === 'speaking' || s === 'TALKING') return 'talking';
  return 'idle';
}

// Pseudo-noise 3D murah (tanpa dependensi simplex-noise):
// kombinasi sinus sudah cukup untuk distorsi organik blob.
function pseudoNoise(x, y, z, t) {
  return (
    Math.sin(x * 1.8 + t) * 0.45 +
    Math.sin(y * 2.2 + t * 1.3) * 0.3 +
    Math.sin(z * 1.7 + t * 0.8) * 0.35 +
    Math.sin((x + y + z) * 0.9 + t * 1.7) * 0.3
  );
}

function BlobMesh({ state }) {
  const meshRef = useRef(null);
  const matRef = useRef(null);
  const lightRef = useRef(null);
  const groupRef = useRef(null);

  // Nilai animasi saat ini — di-lerp menuju target tiap frame agar transisi mulus.
  const cur = useRef({ ...TARGETS.idle });

  // Simpan posisi vertex asli sekali setelah geometry mount.
  const basePositions = useRef(null);

  const key = normalizeState(state);
  const target = TARGETS[key];

  useFrame((_, rawDt) => {
    const mesh = meshRef.current;
    const group = groupRef.current;
    if (!mesh || !group) return;
    const geo = mesh.geometry;
    const dt = Math.min(rawDt || 0.016, 0.05);
    const t = geo.userData.t === undefined ? 0 : geo.userData.t + dt * cur.current.speed;
    geo.userData.t = t;

    // Smooth interpolation menuju target (faktor ~3/detik, frame-rate independent).
    const k = 1 - Math.exp(-dt * 3.2);
    const c = cur.current;
    c.speed += (target.speed - c.speed) * k;
    c.amp += (target.amp - c.amp) * k;
    c.freq += (target.freq - c.freq) * k;
    c.pulseSpeed += (target.pulseSpeed - c.pulseSpeed) * k;
    c.pulseAmp += (target.pulseAmp - c.pulseAmp) * k;
    c.emissive += (target.emissive - c.emissive) * k;
    c.light += (target.light - c.light) * k;
    c.scaleBase += (target.scaleBase - c.scaleBase) * k;

    const pos = geo.attributes.position;
    if (!basePositions.current) {
      basePositions.current = new Float32Array(pos.array);
    }
    const base = basePositions.current;
    const arr = pos.array;

    const elapsed = (geo.userData.elapsed || 0) + dt;
    geo.userData.elapsed = elapsed;

    const talking = key === 'talking';
    // Saat TALKING, modulasi amplitudo dengan envelope agar terasa "berbicara".
    const talkEnvelope = talking ? 0.75 + 0.25 * Math.sin(elapsed * 6.0) * Math.sin(elapsed * 2.3) : 1;

    for (let i = 0; i < arr.length; i += 3) {
      const ox = base[i];
      const oy = base[i + 1];
      const oz = base[i + 2];
      const n = pseudoNoise(ox * c.freq, oy * c.freq, oz * c.freq, t * 2.2);
      const d = 1 + n * c.amp * talkEnvelope;
      arr[i] = ox * d;
      arr[i + 1] = oy * d;
      arr[i + 2] = oz * d;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    // Breathing / pulse: denyut skala + cahaya.
    const breath = Math.sin(elapsed * c.pulseSpeed) * c.pulseAmp;
    if (talking) {
      // Elastis: squash & stretch berlawanan sumbu mengikuti alur respon.
      const wob = Math.sin(elapsed * 5.2);
      const wob2 = Math.sin(elapsed * 3.7 + 1.3);
      group.scale.set(
        c.scaleBase + breath + wob * 0.07,
        c.scaleBase + breath - wob * 0.06 + wob2 * 0.03,
        c.scaleBase + breath * 0.6
      );
    } else {
      group.scale.setScalar(c.scaleBase + breath);
    }

    if (matRef.current) {
      // Pulse warna/cahaya saat THINKING paling terasa.
      const flicker = key === 'thinking' ? Math.sin(elapsed * c.pulseSpeed * 1.4) * 0.18 : 0;
      matRef.current.emissiveIntensity = Math.max(0.1, c.emissive + flicker);
    }
    if (lightRef.current) {
      lightRef.current.intensity = c.light + breath * 6;
    }

    // Rotasi lambat agar highlight hidup.
    group.rotation.y += dt * (0.15 + c.speed * 0.06);
    group.rotation.x += dt * 0.05;
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.55} />
      <pointLight ref={lightRef} position={[2.2, 1.6, 2.4]} intensity={1.6} color="#ff5c7a" />
      <pointLight position={[-2.4, -1.2, 2.0]} intensity={0.7} color="#7f1d1d" />
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          ref={matRef}
          color="#e11d48"
          emissive="#ff1e42"
          emissiveIntensity={0.55}
          roughness={0.22}
          metalness={0.18}
        />
      </mesh>
      {/* Inti terang di tengah untuk kesan "core" LYNN */}
      <mesh scale={0.42}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#fff1f2" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

/**
 * LynnAI — AI Blob LYNN (Three.js, real-time vertex noise).
 * @param {'idle'|'thinking'|'talking'|'loading'} state
 */
export default function LynnAI({ state = 'idle', size = 'h-28 w-28' }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const key = normalizeState(state);
  const statusColor = key === 'thinking' ? '#ff1e42' : key === 'talking' ? '#fb7185' : '#ef4444';

  const canvasKey = useMemo(() => 'lynn-blob-canvas', []);

  return (
    <div className={`relative ${size} animate-lynn-float`} role="img" aria-label={`LYNN ${key}`}>
      {/* Glow luar crimson */}
      <div className="absolute -inset-6 rounded-full bg-red-600/30 blur-2xl animate-lynn-pulse dark:bg-[#ff1e42]/25" />
      <div className="absolute -inset-2 rounded-full bg-red-500/20 blur-xl animate-lynn-pulse-delay" />

      {/* Ring HUD tipis (SVG, statis ringan) */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
        <g
          className={key === 'thinking' ? 'animate-lynn-spin-fast' : 'animate-lynn-spin-slow'}
          style={{ transformOrigin: '100px 100px' }}
        >
          <circle cx="100" cy="100" r="94" fill="none" stroke="#ef4444" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 7" />
        </g>
        <g className="animate-lynn-spin-reverse" style={{ transformOrigin: '100px 100px' }}>
          <circle cx="100" cy="100" r="68" fill="none" stroke="#ef4444" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 5" />
        </g>
      </svg>

      {/* Blob 3D */}
      <div className="absolute inset-3 overflow-hidden rounded-full">
        {mounted ? (
          <Canvas
            key={canvasKey}
            dpr={[1, 2]}
            camera={{ position: [0, 0, 3.1], fov: 42 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: 'transparent' }}
          >
            <BlobMesh state={key} />
          </Canvas>
        ) : (
          <div className="h-full w-full animate-blob-morph bg-[radial-gradient(circle_at_50%_45%,#ff1e42,#7f1d1d_70%,#080203)]" />
        )}
      </div>

      {/* Kilau */}
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.28),transparent_45%)]" />

      {/* Indikator status kecil (tanpa teks) */}
      <span
        className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full animate-lynn-blink"
        style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
      />
    </div>
  );
}

// Re-export agar file lama tetap kompatibel jika masih diimpor di tempat lain.
export { THREE };
