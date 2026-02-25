"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { criarSupabaseNavegador } from "@/lib/supabase-navegador";
import { CyberToast } from "@/components/CyberToast";

/* =======================
   TIPOS
======================= */
type AssinaturaInfo = {
  status: "ativa" | "inativa";
  tipo: "mensal" | "anual";
  periodo_fim: string;
};

type Tipo = {
  id: "mensal" | "anual";
  nome: string;
  preco: string;
  valor: number;
  descricao: string;
  destaque?: boolean;
};

const tipos: Tipo[] = [
  { id: "mensal", nome: "Mensal", preco: "R$ 7,00", valor: 7, descricao: "Acesso completo por 1 mês." },
  { id: "anual", nome: "Anual", preco: "R$ 22,00", valor: 22, descricao: "Acesso completo por 12 meses.", destaque: true },
];

type ToastType = "success" | "error";

/* =======================
   TYPE GUARD
======================= */
function isAssinaturaInfo(data: unknown): data is AssinaturaInfo {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    (d.status === "ativa" || d.status === "inativa") &&
    (d.tipo === "mensal" || d.tipo === "anual") &&
    typeof d.periodo_fim === "string"
  );
}

export default function PaginaAssinaturas() {
  const router = useRouter();
  const supabase = useMemo(() => criarSupabaseNavegador(), []);

  const [user, setUser] = useState<User | null>(null);
  const [authChecado, setAuthChecado] = useState(false);

  const [assinatura, setAssinatura] = useState<AssinaturaInfo | null>(null);
  const [loadingPlano, setLoadingPlano] = useState<Record<string, boolean>>({});
  const [cpf, setCpf] = useState("");
  const [pixUrl, setPixUrl] = useState<string | null>(null);
  const [pixCopiaCola, setPixCopiaCola] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);
  const [planoSelecionado, setPlanoSelecionado] = useState<string | null>(null);

  /* =======================
     TOAST HELPERS
  ======================== */
  const addToast = (message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /* =======================
     AUTH ROBUSTO
     - Usa getSession (restaura rápido)
     - Só redireciona depois da checagem
     - Escuta mudanças de auth (login/logout)
  ======================== */
  useEffect(() => {
    let ativo = true;

    async function initAuth() {
      // 1) sessão local (rápido, evita redirect “à toa”)
      const { data: sess } = await supabase.auth.getSession();
      if (!ativo) return;

      const u = sess.session?.user ?? null;
      setUser(u);
      setAuthChecado(true);

      if (!u) {
        router.replace("/login?redirect=/assinaturas");
        return;
      }

      // 2) opcional: valida/atualiza user no servidor
      // (não é obrigatório pro funcionamento, mas melhora consistência)
      supabase.auth.getUser().then(({ data }) => {
        if (!ativo) return;
        setUser(data.user ?? u);
      });
    }

    initAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!ativo) return;
      const u = session?.user ?? null;
      setUser(u);

      // se deslogar enquanto está na página
      if (!u) router.replace("/login?redirect=/assinaturas");
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, router]);

  /* =======================
     BUSCAR ASSINATURA
  ======================== */
  useEffect(() => {
    if (!user) return;

    supabase
      .from("assinaturas")
      .select("status, tipo, periodo_fim")
      .eq("usuario_id", user.id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && isAssinaturaInfo(data)) setAssinatura(data);
        else setAssinatura(null);
      });
  }, [user, supabase]);

  /* =======================
     REALTIME — ASSINATURAS
     - Continua funcionando com webhook:
       webhook atualiza a tabela -> realtime recebe
  ======================== */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`assinaturas-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assinaturas",
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          // payload.new vem do banco (incluindo update via webhook)
          if (payload.new && isAssinaturaInfo(payload.new)) {
            setAssinatura(payload.new);

            if (payload.new.status === "ativa") {
              addToast("Assinatura ativada!", "success");
              setPixUrl(null);
              setPixCopiaCola(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  /* =======================
     ASSINATURA VÁLIDA
  ======================== */
  const assinaturaValida = useMemo(() => {
    if (!assinatura) return false;
    return assinatura.status === "ativa" && new Date(assinatura.periodo_fim) >= new Date();
  }, [assinatura]);

  /* =======================
     PAGAR
  ======================== */
  const pagar = async (tipo: Tipo) => {
    if (!user) {
      router.push("/login?redirect=/assinaturas");
      return;
    }

    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      addToast("CPF inválido", "error");
      return;
    }

    setPlanoSelecionado(tipo.id);
    setLoadingPlano((prev) => ({ ...prev, [tipo.id]: true }));
    setPixUrl(null);
    setPixCopiaCola(null);

    try {
      const res = await fetch("/api/pagamentos/ggpix/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: user.id,
          // use display_name (se você salva assim no login) e faz fallback:
          nome: user.user_metadata?.display_name ?? user.user_metadata?.nome ?? "Cliente",
          email: user.email,
          cpf: cpfLimpo,
          valor: tipo.valor,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.qr_code_url) throw new Error("Erro PIX");

      setPixUrl(data.qr_code_url);
      setPixCopiaCola(data.copia_cola);
      addToast("PIX gerado com sucesso!", "success");
    } catch {
      addToast("Erro ao gerar PIX", "error");
    } finally {
      setLoadingPlano((prev) => ({ ...prev, [tipo.id]: false }));
      setPlanoSelecionado(null);
    }
  };

  /* =======================
     RENDER
  ======================== */
  if (!authChecado) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 text-center text-white/70">
        Carregando...
      </section>
    );
  }

  // se não tem user, o effect já redireciona
  if (!user) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      {/* Toasts */}
      {toasts.map((toast) => (
        <CyberToast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
          duration={4000}
        />
      ))}

      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold text-cyan-400">Assinaturas</h1>
        <p className="mt-2 text-purple-300">FonteDosPlugins</p>
      </header>

      {assinaturaValida && assinatura ? (
        <div className="max-w-xl mx-auto rounded-3xl p-8 bg-black/30 border border-green-400 text-center">
          <h2 className="text-2xl font-bold text-green-400 mb-2">Assinatura ativa</h2>
          <p className="text-white">
            Plano: <strong className="capitalize">{assinatura.tipo}</strong>
          </p>
          <p className="text-white mt-1">
            Válida até: <strong>{new Date(assinatura.periodo_fim).toLocaleDateString("pt-BR")}</strong>
          </p>
        </div>
      ) : (
        <>
          <div className="max-w-md mx-auto mb-10">
            <input
              type="text"
              placeholder="Digite seu CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="w-full rounded-xl bg-black/20 border p-3 text-white"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {tipos.map((tipo) => (
              <div
                key={tipo.id}
                className={`rounded-3xl p-8 border ${
                  planoSelecionado === tipo.id
                    ? "border-cyan-400 bg-black/30 shadow-[0_0_20px_cyan]"
                    : "bg-black/20"
                }`}
              >
                <h2 className="text-2xl text-cyan-400">{tipo.nome}</h2>
                <p className="text-3xl text-white mt-3">{tipo.preco}</p>
                <p className="text-white/70 mt-2">{tipo.descricao}</p>

                <button
                  onClick={() => pagar(tipo)}
                  disabled={loadingPlano[tipo.id]}
                  className="mt-6 w-full border py-3 rounded-xl text-cyan-400 hover:bg-white/10 transition"
                >
                  {loadingPlano[tipo.id] ? "Gerando PIX..." : "Pagar com PIX"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal PIX */}
      {pixUrl && pixCopiaCola && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-md text-center border border-cyan-400 shadow-lg">
            <h3 className="text-xl font-semibold text-cyan-400 mb-4">Pague com PIX</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pixUrl} alt="QR Code PIX" className="mx-auto mb-4 rounded-lg bg-white p-2" />
            <textarea
              readOnly
              value={pixCopiaCola}
              className="w-full bg-black/20 text-white p-3 rounded-lg text-sm mb-4"
              rows={4}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(pixCopiaCola);
                addToast("Código PIX copiado!", "success");
              }}
              className="w-full mb-3 border border-green-500 text-green-400 rounded-lg py-2 font-semibold hover:text-white hover:shadow-[0_0_15px_green] transition"
            >
              Copiar código PIX
            </button>
            <button
              onClick={() => {
                setPixUrl(null);
                setPixCopiaCola(null);
              }}
              className="w-full text-red-400 border border-red-400 py-2 rounded-lg hover:text-white hover:shadow-[0_0_15px_red] transition font-semibold"
            >
              Fechar
            </button>
            <p className="mt-4 text-white/60 text-sm">Após o pagamento, sua assinatura será ativada automaticamente.</p>
          </div>
        </div>
      )}
    </section>
  );
}
