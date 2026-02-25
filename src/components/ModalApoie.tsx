"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { criarSupabaseNavegador } from "@/lib/supabase-navegador";
import type { User } from "@supabase/supabase-js";
import ModalStageFX from "@/components/ModalStageFX";

type ModalProps = {
  onClose: () => void;
};

export default function ModalApoie({ onClose }: ModalProps) {
  const router = useRouter();
  const supabase = useMemo(() => criarSupabaseNavegador(), []);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setUser(data.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // trava scroll + ESC fecha
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleButtonClick = () => {
    router.push(user ? "/assinaturas" : "/login?retorno=/assinaturas");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Apoie o projeto"
      onMouseDown={(e) => {
        // fecha só se clicar no "fundo"
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* overlay base */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />
      <div className="absolute inset-0 modal-stage-vignette pointer-events-none" />

      {/* FX FULLSCREEN que seguem o mouse */}
      <ModalStageFX intensity={1.1} />

      {/* Card central */}
      <div className="relative z-10 w-full max-w-xl">
        {/* halo externo */}
        <div className="pointer-events-none absolute -inset-[2px] rounded-[32px] bg-gradient-to-r from-cyan-400/40 via-blue-500/25 to-fuchsia-500/35 blur-[14px] opacity-85" />

        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] shadow-[0_25px_140px_rgba(0,0,0,0.72)]">
          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition cursor-pointer"
          >
            ✕
          </button>

          {/* Conteúdo */}
          <div className="relative z-10 p-5 sm:p-6">
            {/* Mídia */}
            <div className="relative mb-5 overflow-hidden rounded-2xl border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/imagens/modal-apoie.png"
                alt="Apoie o projeto"
                className="h-[220px] w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                loading="lazy"
              />
            </div>

            <h2 className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                Apoie o projeto
              </span>
            </h2>

            <p className="mt-3 text-center text-sm sm:text-base text-white/75 leading-relaxed">
              Seu apoio mantém o site vivo e acelera novas curadorias, plugins e atualizações constantes.
            </p>

            <div className="mt-6 grid gap-3">
              <button
                onClick={handleButtonClick}
                className="
  relative w-full rounded-2xl px-5 py-4 text-base sm:text-lg font-extrabold text-black
  bg-gradient-to-r from-[rgba(var(--fx-a),1)] via-blue-500 to-[rgba(var(--fx-b),1)]
  shadow-[0_0_0_1px_rgba(255,255,255,0.16)_inset,0_18px_60px_rgba(0,246,255,0.12)]
  overflow-hidden
  transition
  hover:brightness-110 active:brightness-95
  before:absolute before:inset-0 before:opacity-0 before:transition
  before:bg-[radial-gradient(120px_80px_at_20%_10%,rgba(255,255,255,0.55),transparent_60%)]
  hover:before:opacity-100
  after:absolute after:-inset-[2px] after:rounded-[18px] after:opacity-0 after:transition
  after:bg-[conic-gradient(from_180deg,rgba(var(--fx-a),0.0),rgba(var(--fx-a),0.35),rgba(var(--fx-b),0.25),rgba(var(--fx-a),0.0))]
  hover:after:opacity-100 cursor-pointer
">
                Apoiar / Assinar agora
              </button>

              <button
                onClick={onClose}
                className="
  w-full rounded-2xl px-5 py-3 text-sm sm:text-base font-semibold
  border border-white/10 bg-white/[0.04] text-white/80
  hover:bg-white/[0.08] hover:text-white
  hover:shadow-[0_0_0_1px_rgba(var(--fx-a),0.22),0_0_38px_rgba(var(--fx-a),0.08)]
  transition cursor-pointer
"

              >
                Agora não
              </button>
            </div>

            <div className="mt-4 text-center text-xs text-white/45">
              Você pode fechar quando quiser — sem compromisso.
            </div>
          </div>

          {/* brilho interno sutil */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-500/12 blur-[120px]" />
        </div>
      </div>
    </div>
  );
}
