'use client';
import { useEffect, useRef } from 'react';

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

// Ray-marched flight down an endless monochrome canyon.
// Dinding diarsir berdasarkan seberapa jauh tiap ray berjalan (fog by distance).
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;

float mapScene(vec3 p) {
  float wz = p.z;
  float halfW = 2.6 + 1.2 * sin(wz * 0.11) + 0.6 * sin(wz * 0.031 + 1.7);
  float dWall = halfW - abs(p.x);
  float fl = -1.6 + 0.5 * sin(wz * 0.13 + p.x * 0.25) + 0.25 * sin(wz * 0.51);
  float dFloor = p.y - fl;
  float ce = 3.4 + 0.9 * sin(wz * 0.09 + 0.6) + 0.4 * sin(wz * 0.23 + 2.0);
  float dCeil = ce - p.y;
  return min(dWall, min(dFloor, dCeil));
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.02, 0.0);
  return normalize(vec3(
    mapScene(p + e.xyy) - mapScene(p - e.xyy),
    mapScene(p + e.yxy) - mapScene(p - e.yxy),
    mapScene(p + e.yyx) - mapScene(p - e.yyx)
  ));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
  float t = uTime;

  float cz = t * 2.2;
  vec3 ro = vec3(0.8 * sin(t * 0.13), 0.4 + 0.35 * sin(t * 0.09), cz);
  vec3 ta = vec3(0.8 * sin(t * 0.13 + 0.6), 0.3 + 0.3 * sin(t * 0.09 + 0.4), cz + 4.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.6 * fw);

  float dist = 0.0;
  float hit = -1.0;
  for (int i = 0; i < 64; i++) {
    vec3 p = ro + rd * dist;
    float h = mapScene(p);
    if (h < 0.02) { hit = 1.0; break; }
    dist += h * 0.9;
    if (dist > 60.0) break;
  }

  vec3 col = vec3(0.02, 0.023, 0.03);
  if (hit > 0.0) {
    vec3 p = ro + rd * dist;
    vec3 n = calcNormal(p);
    vec3 li = normalize(vec3(0.4, 0.8, 0.3));
    float dif = clamp(dot(n, li) * 0.5 + 0.5, 0.0, 1.0);
    float band = 0.75 + 0.25 * sin(p.y * 4.0 + p.z * 0.35 + sin(p.x * 2.0) * 0.8);
    float fog = exp(-dist * 0.055);
    float v = (0.15 + 0.85 * dif) * band * fog;
    col = vec3(v * 0.92, v * 0.97, v * 1.08);
  } else {
    float g = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
    col = vec3(0.03 + 0.05 * g, 0.035 + 0.055 * g, 0.05 + 0.08 * g);
  }
  float vig = smoothstep(1.4, 0.4, length(uv * 0.7));
  col *= mix(0.6, 1.0, vig);
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || 'shader compile failed');
  }
  return sh;
}

// Background canyon tak berujung (pengganti custom Ravine).
// Hemat GPU: DPR dibatasi 1, pause saat tab disembunyi, hormat reduced-motion.
export default function RavineBackground({ className = '', speed = 1.0 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let gl = null;
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    } catch (err) {
      gl = null;
    }
    if (!gl) {
      console.error('[Ravine] WebGL tidak tersedia, pakai background statis.');
      return; // fallback: biarkan background parent
    }

    let prog = null;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed');
    } catch (err) {
      console.error('[Ravine] shader gagal:', err?.message || err);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    const start = performance.now();
    const draw = (now) => {
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, ((now - start) / 1000) * speed + 8.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (reduced) {
      draw(start); // satu frame statis
    } else {
      const loop = (now) => {
        if (!document.hidden) draw(now);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [speed]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
