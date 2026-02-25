"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import CyberCard from "@/components/CyberCard/CyberCard";
import { criarSupabaseNavegador } from "@/lib/supabase-navegador";

type Assinatura = {
  status: "ativa" | "inativa";
  periodo_fim: string;
};

type Props = {
  href: string;
  className?: string;
  assinanteAtivo?: boolean; // ✅ vindo do server
};

function isAssinanteAtivo(a: Assinatura | null): boolean {
  if (!a || a.status !== "ativa") return false;
  const fim = Date.parse(a.periodo_fim);
  if (!Number.isFinite(fim)) return false;
  return fim >= Date.now();
}

export default function AssinaturaCtaGate({
  href,
  className = "",
  assinanteAtivo = false,
}: Props) {
  const pathname = usePathname();
  const supabase = criarSupabaseNavegador();

  // ✅ trava final (client): começa com o valor do server
  const [bloqueado, setBloqueado] = useState<boolean>(assinanteAtivo);

  // ✅ não mostrar CTA nessas rotas
  const ocultar =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/assinaturas" ||
    pathname.startsWith("/assinaturas/");

  useEffect(() => {
    let alive = true;

    async function checar() {
      // se server já disse que é assinante, já bloqueia
      if (assinanteAtivo) {
        if (alive) setBloqueado(true);
        return;
      }

      // client double-check: se estiver logado e assinatura ativa, esconde
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!alive) return;

      if (!user) {
        setBloqueado(false);
        return;
      }

      const { data: assinaturaDb } = await supabase
        .from("assinaturas")
        .select("status, periodo_fim")
        .eq("usuario_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (assinaturaDb && typeof assinaturaDb === "object") {
        const obj = assinaturaDb as Record<string, unknown>;
        const status = obj["status"];
        const periodo_fim = obj["periodo_fim"];

        const a: Assinatura | null =
          (status === "ativa" || status === "inativa") && typeof periodo_fim === "string"
            ? { status, periodo_fim }
            : null;

        setBloqueado(isAssinanteAtivo(a));
      } else {
        setBloqueado(false);
      }
    }

    checar();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      checar();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [assinanteAtivo, supabase]);

  if (ocultar) return null;
  if (bloqueado) return null;

  return (
    <div className={`px-2 sm:px-3 md:px-0 ${className}`}>
      <Link
        href={href}
        className="
          group relative block w-full overflow-hidden
          rounded-[24px] sm:rounded-[28px] md:rounded-[32px]
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-cyan-300/60
        "
      >
        {/* IMAGEM */}
        <div
          className="
            pointer-events-none absolute inset-0 z-[1]
            bg-cover
            bg-[position:38%_center] md:bg-center
          "
          style={{ backgroundImage: "url('/imagens/banner-apoie.webp')" }}
        />

        {/* NEON */}
        <div className="pointer-events-none absolute inset-0 z-[4] opacity-[0.35] md:opacity-[0.45]">
          <CyberCard className="h-full w-full" />
        </div>

        {/* CONTEÚDO */}
        <div className="relative z-[5] grid min-h-[180px] sm:min-h-[220px] md:min-h-[405px] p-5 sm:p-6 md:p-10 md:grid-cols-12">
          <div className="hidden md:block md:col-span-8" />
        </div>

        {/* BORDA */}
        <div className="pointer-events-none absolute inset-0 z-[6] rounded-[24px] sm:rounded-[28px] md:rounded-[32px] ring-1 ring-inset ring-white/10" />
      </Link>
    </div>
  );
}
