"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { criarSupabaseNavegador } from "@/lib/supabase-navegador";
import type { User } from "@supabase/supabase-js";
import AnimatedLink from "@/components/AnimatedLink/AnimatedLink";

export type Assinatura = {
  status: "ativa" | "inativa";
  periodo_fim: string;
};

function getDisplayName(user: User | null): string {
  const metaUnknown: unknown = user?.user_metadata;

  if (metaUnknown && typeof metaUnknown === "object") {
    const meta = metaUnknown as Record<string, unknown>;
    const dn = meta["display_name"];
    if (typeof dn === "string" && dn.trim()) return dn.trim();
  }

  return user?.email?.split("@")[0] || "Usuário";
}

type PopoverPos = {
  top: number;
  left: number;
  width: number;
};

export function AcoesUsuarioCabecalho({
  assinatura: assinaturaProp,
}: {
  assinatura?: Assinatura | null;
}) {
  const supabase = criarSupabaseNavegador();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(
    assinaturaProp ?? null
  );
  const [assinaturaAtiva, setAssinaturaAtiva] = useState(false);

  // "Saindo..." deve aparecer só durante o signOut e sumir quando a sessão realmente cair
  const [saindo, setSaindo] = useState(false);

  const [menuAberto, setMenuAberto] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  const fetchAssinatura = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("assinaturas")
      .select("status, periodo_fim")
      .eq("usuario_id", userId)
      .maybeSingle();

    if (!data || typeof data !== "object") {
      setAssinatura(null);
      return;
    }

    const obj = data as Record<string, unknown>;
    const status = obj["status"];
    const periodo_fim = obj["periodo_fim"];

    if (
      (status === "ativa" || status === "inativa") &&
      typeof periodo_fim === "string"
    ) {
      setAssinatura({ status, periodo_fim });
    } else {
      setAssinatura(null);
    }
  }, [supabase]);

  // Login/Logout + realtime assinatura
  useEffect(() => {
    let alive = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setUser(data.user);
      if (data.user) fetchAssinatura(data.user.id);
      else setAssinatura(null);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;

      // sessão caiu -> garante consistência visual
      if (!session?.user) {
        setUser(null);
        setAssinatura(null);
        setAssinaturaAtiva(false);
        setMenuAberto(false);
        setSaindo(false); // some "Saindo..." só quando realmente deslogou
        return;
      }

      setUser(session.user);
      fetchAssinatura(session.user.id);
    });

    const canal = supabase
      .channel("realtime-assinatura")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assinaturas" },
        (payload) => {
          if (!alive) return;

          const novoUnknown: unknown = payload.new;
          if (!novoUnknown || typeof novoUnknown !== "object") return;

          const novo = novoUnknown as Record<string, unknown>;
          const uid = user?.id;
          if (!uid) return;

          if (novo["usuario_id"] !== uid) return;

          const status = novo["status"];
          const periodo_fim = novo["periodo_fim"];

          if (
            (status === "ativa" || status === "inativa") &&
            typeof periodo_fim === "string"
          ) {
            setAssinatura({ status, periodo_fim });
          }
        }
      )
      .subscribe();

    return () => {
      alive = false;
      authSub.subscription.unsubscribe();
      supabase.removeChannel(canal);
    };
  }, [supabase, user?.id, fetchAssinatura]);

  // status assinatura
  useEffect(() => {
    function atualizarStatus() {
      if (!assinatura || assinatura.status !== "ativa") {
        setAssinaturaAtiva(false);
        return;
      }
      const agora = Date.now();
      const fim = new Date(assinatura.periodo_fim).getTime();
      setAssinaturaAtiva(fim >= agora);
    }

    atualizarStatus();
    const interval = setInterval(atualizarStatus, 60_000);
    return () => clearInterval(interval);
  }, [assinatura]);

  const logado = !!user;

  const nomeExibicao = useMemo(() => getDisplayName(user), [user]);

  async function sair() {
    if (saindo) return;

    setSaindo(true);
    try {
      await supabase.auth.signOut();
      // não setSaindo(false) aqui: quem finaliza é o onAuthStateChange quando session cair
    } catch {
      setSaindo(false);
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  function irParaAssinatura() {
    router.push(logado ? "/assinaturas" : "/login?retorno=/assinaturas");
  }

  // ======= MENU SUSPENSO (MOBILE) =======

  function calcularPosicao() {
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const gap = 10;

    // alinhado à direita do botão
    const width = Math.min(360, Math.floor(window.innerWidth * 0.92));
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top = Math.min(rect.bottom + gap, window.innerHeight - 12);

    setPos({ top, left, width });
  }

  useEffect(() => {
    if (!menuAberto) return;

    calcularPosicao();

    const onResize = () => calcularPosicao();
    const onScroll = () => calcularPosicao(); // header sticky muda posição “real”

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [menuAberto]);

  // fecha ao clicar fora
  useEffect(() => {
    if (!menuAberto) return;

    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setMenuAberto(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAberto(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuAberto]);

  useEffect(() => {
    if (!menuAberto) return;
  
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
  
    // evita “pulo” do layout quando some a scrollbar
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
  
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [menuAberto]);
  

  const popover =
    menuAberto && mounted && pos
      ? createPortal(
          <div className="fixed inset-0 z-[2147483647] md:hidden">
            {/* click-catcher (sem “barra lateral”) */}
            <div className="absolute inset-0 bg-black/35" />

            <div
              ref={menuRef}
              style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
              }}
              className="
                fixed
                rounded-2xl
                bg-black/90 backdrop-blur-2xl
                border border-white/10
                ring-1 ring-white/10
                shadow-2xl shadow-black/60
                p-3
              "
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-sm text-white/70">Menu</span>
                <button
                  type="button"
                  onClick={() => setMenuAberto(false)}
                  className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/15 ring-1 ring-white/10"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <Link
                  href="/plugins"
                  onClick={() => setMenuAberto(false)}
                  className="block rounded-xl px-4 py-3 text-white/90 hover:bg-white/10"
                >
                  Plugins
                </Link>
                <Link
                  href="/drum-kit"
                  onClick={() => setMenuAberto(false)}
                  className="block rounded-xl px-4 py-3 text-white/90 hover:bg-white/10"
                >
                  Drum-Kits
                </Link>
                <Link
                  href="/daws"
                  onClick={() => setMenuAberto(false)}
                  className="block rounded-xl px-4 py-3 text-white/90 hover:bg-white/10"
                >
                  DAWs
                </Link>
                <Link
                  href="/programas"
                  onClick={() => setMenuAberto(false)}
                  className="block rounded-xl px-4 py-3 text-white/90 hover:bg-white/10"
                >
                  Programas
                </Link>
              </div>

              <div className="my-3 h-px bg-white/10" />

              <div className="space-y-2">
                {!assinaturaAtiva ? (
                  <button
                  onClick={() => {
                    setMenuAberto(false);
                    irParaAssinatura();
                  }}
                  className="uiverse-button w-full justify-center"
                >
                  <span>Apoiar / Assinar</span>
                </button>                
                ) : (
                  assinatura && (
                    <div className="rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-300 ring-1 ring-green-300/20">
                      Assinatura ativa até:{" "}
                      {new Date(assinatura.periodo_fim).toLocaleDateString("pt-BR")}
                    </div>
                  )
                )}

                {!logado ? (
                  <Link
                    href="/login?retorno=/"
                    onClick={() => setMenuAberto(false)}
                    className="block w-full rounded-xl bg-white/10 px-4 py-3 text-center text-white/90 hover:bg-white/15"
                  >
                    {saindo ? "Saindo..." : "Entrar"}
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/minha-conta"
                      onClick={() => setMenuAberto(false)}
                      className="block w-full rounded-xl bg-white/10 px-4 py-3 text-center text-white/90 hover:bg-white/15"
                    >
                      Minha conta
                    </Link>

                    <button
                      onClick={async () => {
                        await sair();
                        // menu fecha, mas "Saindo..." fica até session cair via onAuthStateChange
                        setMenuAberto(false);
                      }}
                      disabled={saindo}
                      className="w-full rounded-xl bg-white/5 px-4 py-3 text-white/70 hover:bg-white/10 disabled:opacity-50"
                    >
                      {saindo ? "Saindo..." : "Sair"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="flex items-center gap-5">
        {/* DESKTOP MENU (como você já tinha) */}
        <div className="hidden md:flex items-center gap-4 text-sm text-white/80">
          <AnimatedLink href="/plugins" text="Plugins" startsWith />
          <AnimatedLink href="/drum-kit" text="Drum-Kits" startsWith />
          <AnimatedLink href="/daws" text="DAWs" startsWith />
          <AnimatedLink href="/programas" text="Programas" startsWith />
        </div>

        {/* CTA / assinatura (desktop) */}
        {!assinaturaAtiva && (
          <button
            onClick={irParaAssinatura}
            className="uiverse-button hidden md:inline-flex"
          >
            <span>Apoiar / Assinar</span>
          </button>
        )}

        {assinaturaAtiva && assinatura && (
          <span className="hidden md:inline text-sm text-green-400">
            Assinatura ativa até:{" "}
            {new Date(assinatura.periodo_fim).toLocaleDateString("pt-BR")}
          </span>
        )}

        {/* Login/conta (desktop) */}
        <div className="hidden md:flex items-center gap-5">
          {!logado ? (
            <Link
              href="/login?retorno=/"
              className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Entrar
            </Link>
          ) : (
            <>
              <Link
                href="/minha-conta"
                className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
              >
                Olá, {nomeExibicao}
              </Link>

              <button
                onClick={sair}
                disabled={saindo}
                className="text-sm text-white/50 hover:text-white disabled:opacity-50"
              >
                {saindo ? "Saindo..." : "Sair"}
              </button>
            </>
          )}
        </div>

        {/* MOBILE: HAMBURGER (abre popover suspenso) */}
        <button
          ref={btnRef}
          type="button"
          onClick={() => setMenuAberto((v) => !v)}
          className="
            md:hidden inline-flex items-center justify-center
            h-10 w-10 rounded-full
            bg-white/10 hover:bg-white/15
            ring-1 ring-white/10
          "
          aria-label="Abrir menu"
          aria-expanded={menuAberto}
        >
          <span className="block h-[2px] w-5 bg-white/80 rounded-full relative">
            <span className="absolute -top-2 left-0 h-[2px] w-5 bg-white/80 rounded-full" />
            <span className="absolute top-2 left-0 h-[2px] w-5 bg-white/80 rounded-full" />
          </span>
        </button>
      </div>

      {/* MENU SUSPENSO (Portal) */}
      {popover}
    </>
  );
}
