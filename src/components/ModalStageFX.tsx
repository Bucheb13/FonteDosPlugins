"use client";

import { useEffect, useRef } from "react";

type Props = { intensity?: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  hue: 0 | 1;
  glyph: string;
  rot: number;
  vr: number;
};

export default function ModalStageFX({ intensity = 1 }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0.5, y: 0.5 });
  const smoothRef = useRef({ x: 0.5, y: 0.5 });
  const prevSmoothRef = useRef({ x: 0.5, y: 0.5 });

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
    const mobileLike = window.innerWidth < 760 || (navigator?.hardwareConcurrency ?? 8) <= 4;
    const SCALE = mobileLike ? 0.84 : 0.92;
    const dprCap = 2;

    const cs = getComputedStyle(document.documentElement);
    const fxA = (cs.getPropertyValue("--fx-a") || "0, 246, 255").trim();
    const fxB = (cs.getPropertyValue("--fx-b") || "255, 60, 180").trim();

    let w = 0;
    let h = 0;
    let last = performance.now();
    let t = 0;

    const sparks: Spark[] = [];
    const SPARK_MAX = Math.floor((mobileLike ? 26 : 42) * clamp(intensity, 0.6, 1.35));
    let sparkTimer = 0;
    const glyphs = ["♪", "♫", "♩", "♬", "𝅘𝅥", "𝅘𝅥𝅮"];

    let peaks: Float32Array = new Float32Array(1);
    let peakLen = 0;
    let writeIndex = 0;
    let env = 0;
    let transient = 0;

    const resize = () => {
      const dpr = Math.max(1, Math.min(dprCap, window.devicePixelRatio || 1));
      w = Math.floor(window.innerWidth * dpr * SCALE);
      h = Math.floor(window.innerHeight * dpr * SCALE);

      canvas.width = w;
      canvas.height = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      peakLen = Math.max(120, Math.floor(w * 0.22));
      peaks = new Float32Array(peakLen);
      writeIndex = 0;
      env = 0;
      transient = 0;
    };

    const onMove = (e: PointerEvent) => {
      targetRef.current.x = e.clientX / window.innerWidth;
      targetRef.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const pushPeak = (value: number) => {
      peaks[writeIndex] = value;
      writeIndex = (writeIndex + 1) % peakLen;
    };

    const pulse = (time: number, energy: number) => {
      const e = clamp(energy, 0, 1.8);
      const beat = 0.5 + 0.5 * Math.sin(time * (3.5 + e * 2.2));
      const trem = 0.5 + 0.5 * Math.sin(time * (15 + e * 12));
      const snap = Math.pow(Math.max(0, Math.sin(time * (6 + e * 4))), 4);
      return clamp(0.08 + beat * 0.5 + trem * 0.18 + snap * 0.5, 0, 1);
    };

    const spawnSparks = (cx: number, cy: number, energy: number) => {
      if (prefersReduced) return;
      if (sparks.length >= SPARK_MAX) return;

      const burst = clamp(Math.floor(1 + energy * 1.8), 1, mobileLike ? 2 : 3);
      for (let i = 0; i < burst && sparks.length < SPARK_MAX; i++) {
        const ang = rand(-Math.PI, Math.PI);
        const sp = rand(18, mobileLike ? 40 : 58) * (0.75 + energy * 0.55) * intensity;
        const ttl = rand(0.5, 1.1);
        const size = rand(mobileLike ? 1.2 : 1.4, mobileLike ? 2.3 : 2.8);

        sparks.push({
          x: cx + rand(-10, 10),
          y: cy + rand(-10, 10),
          vx: Math.cos(ang) * sp * 0.8,
          vy: Math.sin(ang) * sp * 0.45 - rand(6, 18),
          life: ttl,
          ttl,
          size,
          hue: Math.random() < 0.7 ? 0 : 1,
          glyph: glyphs[Math.floor(rand(0, glyphs.length))] ?? "♪",
          rot: rand(-0.35, 0.35),
          vr: rand(-0.9, 0.9) * 0.5,
        });
      }
    };

    const drawWave = (cx: number, cy: number) => {
      const trackW = peakLen;
      const trackH = mobileLike ? 44 : 56;

      const x0 = clamp(cx - trackW * 0.52, 18, w - trackW - 18);
      const y0 = clamp(cy - trackH * 0.72, 24, h - trackH - 24);
      const playX = x0 + trackW * 0.78;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(x0, y0, trackW, trackH);

      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      const gridN = 8;
      for (let i = 0; i <= gridN; i++) {
        const gx = x0 + (trackW * i) / gridN;
        ctx.beginPath();
        ctx.moveTo(gx, y0 + 6);
        ctx.lineTo(gx, y0 + trackH - 6);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.moveTo(x0 + 8, y0 + trackH / 2);
      ctx.lineTo(x0 + trackW - 8, y0 + trackH / 2);
      ctx.stroke();

      ctx.globalAlpha = 0.48;
      ctx.strokeStyle = `rgba(${fxA},0.46)`;
      ctx.beginPath();
      ctx.moveTo(playX, y0 + 6);
      ctx.lineTo(playX, y0 + trackH - 6);
      ctx.stroke();
      ctx.restore();

      const midY = y0 + trackH / 2;
      const maxAmpPx = trackH * 0.46 * intensity;
      const idxStart = writeIndex;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = `rgba(${fxA},0.48)`;

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

      ctx.globalAlpha = 0.24;
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = "rgba(255,255,255,0.74)";
      ctx.beginPath();
      for (let i = 0; i < trackW; i++) {
        const bi = (idxStart + i) % peakLen;
        const p = peaks[bi];
        const a = p * maxAmpPx;
        if (i === 0) ctx.moveTo(x0 + i, midY - a);
        else ctx.lineTo(x0 + i, midY - a);
      }
      ctx.stroke();

      ctx.globalAlpha = 0.07;
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(${fxB},0.36)`;
      ctx.beginPath();
      ctx.moveTo(x0 + 10, y0 + trackH - 8);
      ctx.lineTo(x0 + trackW - 10, y0 + trackH - 8);
      ctx.stroke();

      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.44;
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, trackW - 1, trackH - 1);
      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      t += dt;
      ctx.clearRect(0, 0, w, h);

      const smooth = smoothRef.current;
      const target = targetRef.current;
      const prevSmooth = prevSmoothRef.current;

      const smoothT = prefersReduced ? 0.28 : 0.15;
      smooth.x = lerp(smooth.x, target.x, smoothT);
      smooth.y = lerp(smooth.y, target.y, smoothT);
      root.style.setProperty("--mx", String(smooth.x));
      root.style.setProperty("--my", String(smooth.y));

      const cx = smooth.x * w;
      const cy = smooth.y * h;
      const mdx = smooth.x - prevSmooth.x;
      const mdy = smooth.y - prevSmooth.y;
      const energy = clamp(Math.hypot(mdx, mdy) * 140, 0, 1.8);
      prevSmooth.x = smooth.x;
      prevSmooth.y = smooth.y;

      if (!prefersReduced) {
        const raw = pulse(t, energy);
        if (Math.random() < 0.12 * (0.6 + energy)) transient = 1;
        transient = Math.max(0, transient - dt * 7);

        const targetEnv = clamp(raw + transient * (0.5 + 0.2 * energy), 0, 1);
        const attack = 22;
        const release = 9;
        env += (targetEnv - env) * clamp(dt * (targetEnv > env ? attack : release), 0, 1);

        pushPeak(env);
        pushPeak(env * rand(0.9, 1.05));
        pushPeak(env * rand(0.86, 1.08));
      } else {
        pushPeak(0);
      }

      drawWave(cx, cy);

      if (!prefersReduced) {
        sparkTimer -= dt;
        if (sparkTimer <= 0) {
          spawnSparks(cx, cy, energy);
          sparkTimer = rand(0.08, 0.2) / (0.88 + 0.35 * intensity);
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rot += s.vr * dt;
        s.vx *= 0.98;
        s.vy *= 0.985;

        const p = clamp(s.life / s.ttl, 0, 1);
        const col = s.hue === 0 ? fxA : fxB;
        ctx.globalAlpha = 0.1 + p * 0.22;
        ctx.font = `${Math.round(s.size * (mobileLike ? 9 : 10))}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
        ctx.fillStyle = `rgba(${col},0.92)`;
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.fillText(s.glyph, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, mobileLike ? 80 : 120);
      glow.addColorStop(0, `rgba(${fxA},0.16)`);
      glow.addColorStop(0.45, `rgba(${fxB},0.08)`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 140, cy - 140, 280, 280);
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
