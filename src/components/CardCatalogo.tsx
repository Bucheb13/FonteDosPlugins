"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef } from "react";

type ItemBasico = {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
};

function normalizeSubcategoria(raw?: string | null) {
  if (!raw) return "";
  const v = raw.trim().toLowerCase();
  if (v === "drum-kit") return "Drum";
  if (v === "sample-kit") return "Sample";
  if (v === "midi-kit") return "MIDI";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

// Define cor-acento por subcategoria
function accentBySub(sub: string) {
  switch (sub.toLowerCase()) {
    case "efeitos":
      return "bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.55)]";
    case "instrumentais":
      return "bg-fuchsia-300 shadow-[0_0_18px_rgba(217,70,239,0.55)]";
    case "drum":
      return "bg-orange-300 shadow-[0_0_18px_rgba(251,146,60,0.6)]";
    case "sample":
      return "bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.6)]";
    case "midi":
      return "bg-indigo-300 shadow-[0_0_18px_rgba(109,110,78,0.6)]";
    default:
      return "bg-white/70 shadow-[0_0_18px_rgba(255,255,255,0.25)]";
  }
}

export function CardCatalogo({
  item,
  hrefBase,
  etiqueta,
  subcategoria,
}: {
  item: ItemBasico;
  hrefBase: string;
  etiqueta: string;
  subcategoria?: string | null;
}) {
  const sub = normalizeSubcategoria(subcategoria);

  const ref = useRef<HTMLAnchorElement | null>(null);
  const raf = useRef<number | null>(null);

  // Detecta ambiente sem hover (mobile/touch) → não aplica tilt
  const canHover = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches ?? true;
  }, []);

  function setVars(rx: number, ry: number, mxPct: number, myPct: number) {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--mx", `${mxPct}%`);
    el.style.setProperty("--my", `${myPct}%`);
  }

  function onMove(e: React.PointerEvent) {
    if (!canHover) return;

    const el = ref.current;
    if (!el) return;

    // Throttle via rAF (suave e leve)
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;

      const px = Math.min(1, Math.max(0, x / r.width));
      const py = Math.min(1, Math.max(0, y / r.height));

      // centro = 0; borda = +-1
      const dx = (px - 0.5) * 2;
      const dy = (py - 0.5) * 2;

      // Ajuste do “punch” (quanto inclina)
      const MAX = 10; // graus
      const ry = dx * MAX;        // esquerda/direita
      const rx = -dy * MAX;       // cima/baixo (invertido)

      setVars(rx, ry, px * 100, py * 100);
      el.classList.add("is-hovered");
    });
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;

    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;

    // volta suave pro neutro
    setVars(0, 0, 50, 50);
    el.classList.remove("is-hovered");
  }

  return (
    <Link
      ref={ref}
      href={`${hrefBase}/${item.slug}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={[
        // Tilt + base
        "cc-tilt group relative flex h-full flex-col overflow-hidden rounded-3xl",
        "border border-white/15 bg-black/40 backdrop-blur-md",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-white/30 hover:bg-black/50",
        "hover:shadow-[0_35px_100px_-40px_rgba(0,0,0,0.95)]",
        // toque mobile (sem tilt)
        "active:scale-[0.99]",
        // foco
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-0",
      ].join(" ")}
    >
      {/* CAPA */}
      <div className="relative w-full overflow-hidden rounded-t-3xl bg-black/60">
        <div className="aspect-[16/9] w-full">
          {item.imagem_capa_url ? (
            <Image
              src={item.imagem_capa_url}
              alt={item.nome}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 25vw"
              className={[
                "object-contain",
                "contrast-[1.08] brightness-[1.06] saturate-[1.06]",
                "transition-transform duration-500 ease-out",
                "group-hover:scale-[1.05]",
              ].join(" ")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-white/55">
              Sem capa
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/75" />
        <div className="pointer-events-none absolute -inset-x-20 -top-10 h-24 rotate-12 bg-white/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* BADGE ESQUERDA */}
      <div
        className={[
          "absolute left-4 top-4",
          "rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide",
          "bg-black/80 text-white",
          "border border-white/25 ring-1 ring-inset ring-white/10",
          "backdrop-blur-md",
          "shadow-[0_10px_30px_rgba(0,0,0,0.75)]",
          "drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]",
        ].join(" ")}
      >
        {etiqueta}
      </div>

      {/* BADGE DIREITA */}
      {sub ? (
        <div
          className={[
            "absolute right-4 top-4",
            "max-w-[56%] truncate",
            "inline-flex items-center gap-2",
            "rounded-full px-3 py-1",
            "text-[11px] font-extrabold tracking-wide",
            "bg-black/85 text-white",
            "border border-white/25 ring-1 ring-inset ring-white/10",
            "backdrop-blur-md",
            "shadow-[0_10px_30px_rgba(0,0,0,0.78)]",
            "drop-shadow-[0_2px_10px_rgba(0,0,0,0.70)]",
            "transition-all duration-300 ease-out",
            "group-hover:scale-[1.06]",
          ].join(" ")}
          title={sub}
        >
          <span className={["h-1.5 w-1.5 rounded-full", accentBySub(sub)].join(" ")} />
          <span className="truncate">{sub}</span>
        </div>
      ) : null}

      {/* CONTEÚDO */}
      <div className="relative z-10 flex flex-1 flex-col p-5">
        {/* altura travada: cards nunca crescem */}
        <div
          className="h-[36px] line-clamp-2 font-sans text-[15px] font-extrabold leading-[1.2] tracking-tight text-white"
          title={item.nome}
        >
          {item.nome}
        </div>

        <div
          className="mt-2 h-[33px] line-clamp-2 font-sans text-xs font-medium leading-[1.35] text-white/80"
          title={item.subtitulo?.trim() || undefined}
        >
          {item.subtitulo?.trim() ? item.subtitulo : "Sem descrição."}
        </div>

        {/* CTA */}
        <div className="mt-auto pt-4">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold text-cyan-200 drop-shadow-[0_2px_10px_rgba(34,211,238,0.25)]">
            Ver detalhes
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </div>
          <div className="mt-2 h-px w-full bg-gradient-to-r from-cyan-400/35 via-white/10 to-transparent" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
    </Link>
  );
}
