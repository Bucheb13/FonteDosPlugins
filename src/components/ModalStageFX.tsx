"use client";

import { useEffect, useRef } from "react";

type Props = { intensity?: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

type Note = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  glyph: string;
  rot: number;
  vr: number;
  huePick: 0 | 1;
};

export default function ModalStageFX({ intensity = 1 }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // mouse em tempo real (sem smoothing)
  const target = useRef({ x: 0.5, y: 0.5 });
  const prev = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    root.style.setProperty("--mx", "0.5");
    root.style.setProperty("--my", "0.5");

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

    const mobileLike =
      window.innerWidth < 640 || (navigator?.hardwareConcurrency ?? 8) <= 4;

    // leve, mas responsivo
    const SCALE = mobileLike ? 0.78 : 0.92;
    const dprCap = 2;

    const cs = getComputedStyle(document.documentElement);
    const fxA = (cs.getPropertyValue("--fx-a") || "0, 246, 255").trim();
    const fxB = (cs.getPropertyValue("--fx-b") || "255, 60, 180").trim();

    let w = 0,
      h = 0;
    let last = performance.now();
    let t = 0;

    // ===== Notes =====
    const notes: Note[] = [];
    const NOTE_MAX = Math.floor((mobileLike ? 60 : 90) * intensity); // ↑ mais notas
    let noteTimer = 0;

    const glyphs = ["♪", "♫", "♩", "♬", "𝅘𝅥", "𝅘𝅥𝅮"];

    // ===== DAW waveform buffer =====
    let peaks: Float32Array = new Float32Array(1);
    let peakLen = 0;
    let writeIndex = 0;

    // envelope “voz” (agora mais agressivo)
    let env = 0;

    // transiente aleatório (picos de consoante)
    let transient = 0;

    const resize = () => {
      const dpr = Math.max(1, Math.min(dprCap, window.devicePixelRatio || 1));
      w = Math.floor(window.innerWidth * dpr * SCALE);
      h = Math.floor(window.innerHeight * dpr * SCALE);

      canvas.width = w;
      canvas.height = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // waveform mais curto (não largo)
      peakLen = Math.max(100, Math.floor(w * 0.15)); // << mais curto ainda
      peaks = new Float32Array(peakLen);
      writeIndex = 0;
      env = 0;
      transient = 0;
    };

    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth;
      const ny = e.clientY / window.innerHeight;

      prev.current.x = target.current.x;
      prev.current.y = target.current.y;

      target.current.x = nx;
      target.current.y = ny;

      // CSS aurora segue instantâneo
      root.style.setProperty("--mx", String(nx));
      root.style.setProperty("--my", String(ny));
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const pushPeak = (value: number) => {
      peaks[writeIndex] = value;
      writeIndex = (writeIndex + 1) % peakLen;
    };

    // Gerador “voz agressiva” (fake) — picos + tremor + transientes
    const fakeVoiceAmp = (time: number, energy: number) => {
      const e = clamp(energy, 0, 1.6);

      // sílabas fortes
      const syll = Math.pow(Math.max(0, Math.sin(time * (3.8 + 2.0 * e))), 1.2);

      // tremor rápido (harmônicos)
      const trem =
        0.5 +
        0.5 *
          Math.sin(
            time * (26.0 + 16.0 * e) + Math.sin(time * (2.2 + 0.6 * e))
          );

      // consonantes (picos curtíssimos)
      const cons = Math.pow(Math.max(0, Math.sin(time * (10.5 + 3.0 * e))), 5);

      // mistura agressiva
      return clamp(0.05 + 0.60 * syll + 0.30 * trem + 0.55 * cons, 0, 1);
    };

    const spawnNoteBurst = (cx: number, cy: number, energy: number) => {
      if (prefersReduced) return;
      if (notes.length >= NOTE_MAX) return;

      // mais energia => mais notas por burst
      const burst = clamp(Math.floor(1 + energy * 2.4), 1, mobileLike ? 3 : 4);

      for (let b = 0; b < burst && notes.length < NOTE_MAX; b++) {
        const glyph = glyphs[Math.floor(rand(0, glyphs.length))] ?? "♪";

        const ang = rand(-Math.PI, Math.PI);
        const sp = rand(18, mobileLike ? 34 : 44) * (0.9 + 0.8 * energy) * intensity;

        const size = rand(mobileLike ? 12 : 13, mobileLike ? 16 : 18) * (0.9 + 0.35 * energy);
        const life = rand(0.9, 1.7);

        notes.push({
          x: cx + rand(-26, 26),
          y: cy + rand(-20, 20),
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - rand(16, 28), // sobe mais
          life,
          size,
          glyph,
          rot: rand(-0.35, 0.35),
          vr: rand(-0.8, 0.8) * 0.55,
          huePick: Math.random() < 0.78 ? 0 : 1,
        });
      }
    };

    const drawDAWWaveform = (cx: number, cy: number) => {
      const trackW = peakLen;
      const trackH = mobileLike ? 50 : 64; // um pouco mais alto (mais agressivo)

      const x0 = clamp(cx - trackW * 0.52, 18, w - trackW - 18);
      const y0 = clamp(cy - trackH * 0.72, 24, h - trackH - 24);

      const playX = x0 + trackW * 0.78;

      // track background (SEM rastro)
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(x0, y0, trackW, trackH);

      // grid (mais DAW)
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;

      const gridN = 10;
      for (let i = 0; i <= gridN; i++) {
        const gx = x0 + (trackW * i) / gridN;
        ctx.beginPath();
        ctx.moveTo(gx, y0 + 6);
        ctx.lineTo(gx, y0 + trackH - 6);
        ctx.stroke();
      }

      // linha central
      ctx.globalAlpha = 0.26;
      ctx.beginPath();
      ctx.moveTo(x0 + 8, y0 + trackH / 2);
      ctx.lineTo(x0 + trackW - 8, y0 + trackH / 2);
      ctx.stroke();

      // playhead
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = `rgba(${fxA},0.40)`;
      ctx.beginPath();
      ctx.moveTo(playX, y0 + 6);
      ctx.lineTo(playX, y0 + trackH - 6);
      ctx.stroke();

      ctx.restore();

      const midY = y0 + trackH / 2;

// ✅ depois (fixo)
const maxAmpPx = trackH * 0.54 * intensity; // ajuste 0.50 ~ 0.60


      const idxStart = writeIndex;

      // fill + outline
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      // fill mais presente (mas ainda premium)
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = `rgba(${fxA},0.60)`;

      ctx.beginPath();
      ctx.moveTo(x0, midY);
      for (let i = 0; i < trackW; i++) {
        const bi = (idxStart + i) % peakLen;
        const p = peaks[bi];
        const a = p * maxAmpPx;
        ctx.lineTo(x0 + i, midY - a);
      }
      for (let i = trackW - 1; i >= 0; i--) {
        const bi = (idxStart + i) % peakLen;
        const p = peaks[bi];
        const a = p * maxAmpPx;
        ctx.lineTo(x0 + i, midY + a);
      }
      ctx.closePath();
      ctx.fill();

      // outline branco (mais nítido)
      ctx.globalAlpha = 0.20;
      ctx.lineWidth = 1.15;
      ctx.strokeStyle = "rgba(255,255,255,0.90)";
      ctx.beginPath();
      for (let i = 0; i < trackW; i++) {
        const bi = (idxStart + i) % peakLen;
        const p = peaks[bi];
        const a = p * maxAmpPx;
        if (i === 0) ctx.moveTo(x0 + i, midY - a);
        else ctx.lineTo(x0 + i, midY - a);
      }
      ctx.stroke();

      // underline pink discreto
      ctx.globalAlpha = 0.08;
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(${fxB},0.40)`;
      ctx.beginPath();
      ctx.moveTo(x0 + 10, y0 + trackH - 8);
      ctx.lineTo(x0 + trackW - 10, y0 + trackH - 8);
      ctx.stroke();

      ctx.restore();

      // borda track
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, trackW - 1, trackH - 1);
      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      t += dt;

      // ✅ SEM RASTRO: limpa tudo todo frame
      ctx.clearRect(0, 0, w, h);

      // mouse em tempo real (sem smoothing)
      const cx = target.current.x * w;
      const cy = target.current.y * h;

      // energia baseada no movimento REAL do mouse
      const mdx = target.current.x - prev.current.x;
      const mdy = target.current.y - prev.current.y;
      const energy = clamp(Math.hypot(mdx, mdy) * 140, 0, 1.6);

      // ===== waveform updates (mais rápido e mais oscilação) =====
      if (!prefersReduced) {
        // base “voz”
        const raw = fakeVoiceAmp(t, energy);

        // transientes extras (spike curtinho)
        if (Math.random() < 0.12 * (0.6 + energy)) transient = 1;
        transient = Math.max(0, transient - dt * 6.5);

        const targetEnv = clamp(raw + transient * (0.55 + 0.35 * energy), 0, 1);

        // ✅ ataque e release super rápidos (agressivo)
        const attack = 28.0;
        const release = 10.0;

        if (targetEnv > env) env += (targetEnv - env) * clamp(dt * attack, 0, 1);
        else env += (targetEnv - env) * clamp(dt * release, 0, 1);

        // ✅ SCROLL 2x (na prática 4 pushes por frame)
        pushPeak(env);
        pushPeak(env * rand(0.85, 1.05));
        pushPeak(env * rand(0.82, 1.08));
        pushPeak(env * rand(0.78, 1.12));
      }

      // desenha waveform (DAW style)
      drawDAWWaveform(cx, cy);

      // ===== notas mais frequentes =====
      if (!prefersReduced) {
        noteTimer -= dt;
        if (noteTimer <= 0) {
          spawnNoteBurst(cx, cy, energy);
          // ✅ bem mais notas
          noteTimer = rand(0.06, 0.14) / (0.95 + 0.6 * intensity);
        }
      }

      // desenha notas (sem rastro porque canvas é limpo)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        n.life -= dt;
        if (n.life <= 0) {
          notes.splice(i, 1);
          continue;
        }

        n.x += n.vx * dt;
        n.y += n.vy * dt;
        n.rot += n.vr * dt;

        const a = clamp(n.life / 1.7, 0, 1);
        const col = n.huePick === 0 ? fxA : fxB;

        ctx.globalAlpha = 0.10 + 0.24 * a; // mais visível
        ctx.font = `${Math.round(n.size)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
        ctx.fillStyle = `rgba(${col},0.88)`;

        ctx.translate(n.x, n.y);
        ctx.rotate(n.rot);
        ctx.fillText(n.glyph, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      ctx.restore();

      rafRef.current = requestAnimationFrame(tick);
    };

    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [intensity]);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 modal-stage-aurora" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full modal-stage-canvas" />
      <div className="absolute inset-x-0 bottom-0 h-[140px] modal-stage-heat" />
    </div>
  );
}
