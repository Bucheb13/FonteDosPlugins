"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/components/admin/admin-contexto";

type Props = {
  titulo?: string;
  subtitulo?: string;
};

type Item = { href: string; label: string };

export default function HeaderAdmin({ titulo = "Onde tudo acontece - FonteDosPlugins", subtitulo = "A Verdadeira Alquimia Das Ruas." }: Props) {
  const pathname = usePathname();
  const { senhaAdmin, setSenhaAdmin, adminPorSessao, verificandoAcesso, mensagem, acaoHeader } = useAdmin();

  const itens: Item[] = [
    { href: "/admin/plugins", label: "Plugins" },
    { href: "/admin/daws", label: "DAWS" },
    { href: "/admin/drum-kit", label: "Drum-Kit" },
    { href: "/admin/programas", label: "Programas" },
    { href: "/admin/assinaturas", label: "Assinaturas" },
  ];

  return (
    <header className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">{subtitulo}</div>
            <h1 className="text-2xl md:text-3xl font-semibold">{titulo}</h1>
            <p className="mt-2 text-white/70 text-sm">Estou te vendo bobinho!</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2">
          {itens.map((it) => {
            const ativo = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={
                  ativo
                    ? "rounded-2xl bg-white text-black px-4 py-2 text-sm font-semibold"
                    : "rounded-2xl border border-white/15 bg-black/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                }
              >
                {it.label}
              </Link>
            );
          })}

          {pathname !== "/admin" ? (
            <Link
              href="/admin"
              className="rounded-2xl border border-cyan-300/35 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/20"
            >
              Voltar ao Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex flex-col sm:flex-row gap-3">
          {verificandoAcesso ? (
            <div className="w-full sm:max-w-sm rounded-2xl bg-black/30 border border-white/10 p-3 text-sm text-white/70">
              Validando acesso admin...
            </div>
          ) : adminPorSessao ? (
            <div className="w-full sm:max-w-sm rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
              Acesso autorizado pela sua conta logada.
            </div>
          ) : (
            <input
              className="w-full sm:max-w-sm rounded-2xl bg-black/30 border border-white/10 p-3 outline-none"
              placeholder="Senha do admin"
              value={senhaAdmin}
              onChange={(e) => setSenhaAdmin(e.target.value)}
              type="password"
            />
          )}

          {acaoHeader ? (
            <button
              type="button"
              onClick={() => void acaoHeader.aoClicar()}
              disabled={!senhaAdmin || acaoHeader.carregando || verificandoAcesso}
              className="rounded-2xl bg-white text-black px-6 py-3 font-semibold disabled:opacity-50"
            >
              {acaoHeader.carregando ? "Carregando..." : acaoHeader.rotulo}
            </button>
          ) : null}
        </div>

        {mensagem ? <div className="text-sm text-white/70">{mensagem}</div> : null}
      </div>
    </header>
  );
}
