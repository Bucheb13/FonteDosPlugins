// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { criarSupabaseServidor } from "@/lib/supabase-servidor";
import { AcoesUsuarioCabecalho } from "@/components/AcoesUsuarioCabecalho";
import ClientWrapper from "@/components/ClientWrapper";
import AnimatedLink from "@/components/AnimatedLink/AnimatedLink";
import AssinaturaCtaGate from "@/components/AssinaturaCtaGate";

export const dynamic = "force-dynamic"; // ✅ evita cache com user errado

type Assinatura = {
  status: "ativa" | "inativa";
  periodo_fim: string;
};

export const metadata: Metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.fontedosplugins.com.br").replace(/\/+$/, "")),
  title: "FonteDosPlugins",
  description: "Plugins e conteúdos para produtores — rápido, moderno e direto.",
  alternates: {
    canonical: "/",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await criarSupabaseServidor();
  const { data } = await supabase.auth.getUser();
  const usuario = data.user;

  let assinatura: Assinatura | null = null;

  if (usuario) {
    const { data: assinaturaDb } = await supabase
      .from("assinaturas")
      .select("status, periodo_fim")
      .eq("usuario_id", usuario.id)
      .maybeSingle()
      .returns<Assinatura>();

    assinatura = assinaturaDb ?? null;
  }

  // ✅ assinatura ativa “de verdade”: status ativa + não expirada
  const assinanteAtivoReal =
    assinatura?.status === "ativa" &&
    Number.isFinite(Date.parse(assinatura.periodo_fim)) &&
    Date.parse(assinatura.periodo_fim) >= new Date().getTime();

  // ✅ Para onde o CTA leva (dinâmico)
  const hrefAssinatura = usuario ? "/assinaturas" : "/login?retorno=/assinaturas";

  const Container = "mx-auto w-full max-w-7xl px-4 md:px-6 py-6 md:py-10";

  return (
    <html lang="pt-BR">
      <body className="corpo-site min-h-screen font-sans flex flex-col">
        {/* HEADER */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/50 backdrop-blur-xl">
          <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-4 md:px-6">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/imagens/LOGO-DEGRADE.png"
                alt="FonteDosPlugins"
                width={70}
                height={46}
                priority
                className="h-12 w-auto opacity-95 transition hover:opacity-100 md:h-14"
              />
            </Link>

            <nav className="flex items-center gap-2 sm:gap-4">
              <AcoesUsuarioCabecalho assinatura={assinatura} />
            </nav>
          </div>
        </header>

        {/* MAIN */}
        <main className="flex-1">
          {children}

          {/* ✅ só aparece se NÃO for assinante (server) */}
          <AssinaturaCtaGate
            href={hrefAssinatura}
            className={Container}
            assinanteAtivo={assinanteAtivoReal}
          />
        </main>

        <ClientWrapper assinatura={assinatura} />

        {/* FOOTER */}
        <footer className="border-t border-white/10 bg-black/90 text-white">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-4 md:flex-row md:px-6">
            <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 bg-clip-text font-semibold text-transparent">
              © {new Date().getFullYear()} FonteDosPlugins
            </span>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              <AnimatedLink href="/contato" text="Contato" startsWith />
              <AnimatedLink href="/termos-de-uso" text="Termos de uso" startsWith />
              <AnimatedLink href="/privacidade" text="Política de privacidade" startsWith />
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
