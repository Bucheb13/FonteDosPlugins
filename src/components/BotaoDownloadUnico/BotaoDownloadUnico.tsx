"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./BotaoDownloadUnico.css";


type TipoItem = "plugin" | "daw" | "drum-kit" | "programa";

type Props = {
  slug: string;
  tipo: TipoItem;
  assinanteAtivo?: boolean;
  className?: string;
};

type EstadoTimer = "nao_iniciado" | "aguardando" | "liberado";

function formatarTempo(segundos: number) {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

function segundosRestantes(isoLiberarEm: string) {
  const liberarMs = new Date(isoLiberarEm).getTime();
  const agoraMs = Date.now();
  const diff = liberarMs - agoraMs;
  return Math.max(0, Math.ceil(diff / 1000));
}

function parseStatus(json: unknown): {
  status?: string;
  liberar_em?: string | null;
  faltam_ms?: number;
  erro?: string;
} {
  if (!json || typeof json !== "object") return {};
  const o = json as Record<string, unknown>;
  return {
    status: typeof o.status === "string" ? o.status : undefined,
    liberar_em: typeof o.liberar_em === "string" ? o.liberar_em : null,
    faltam_ms: typeof o.faltam_ms === "number" ? o.faltam_ms : undefined,
    erro: typeof o.erro === "string" ? o.erro : undefined,
  };
}


function extrairLiberarEmDoIniciar(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;

  const obj = json as Record<string, unknown>;
  if (!("timer" in obj)) return null;

  const timer = obj.timer;
  if (!timer || typeof timer !== "object") return null;

  const t = timer as Record<string, unknown>;
  return typeof t.liberar_em === "string" ? t.liberar_em : null;
}

export function BotaoDownloadUnico({ slug, tipo, assinanteAtivo = false, className = "" }: Props) {
  const [carregando, setCarregando] = useState(true);
  const [clicando, setClicando] = useState(false);

  const [estado, setEstado] = useState<EstadoTimer>("nao_iniciado");
  const [liberarEm, setLiberarEm] = useState<string | null>(null);
  const [restante, setRestante] = useState<number>(0);

  const intervaloRef = useRef<number | null>(null);

  const limparIntervalo = useCallback(() => {
    if (intervaloRef.current !== null) {
      window.clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  }, []);

  const iniciarContador = useCallback((iso: string) => {
    setLiberarEm(iso);

    const inicial = segundosRestantes(iso);
    setRestante(inicial);

    limparIntervalo();
    intervaloRef.current = window.setInterval(() => {
      const s = segundosRestantes(iso);
      setRestante(s);

      if (s <= 0) {
        setEstado("liberado");
        limparIntervalo();
      }
    }, 250);
  }, [limparIntervalo]);

  function resetarTimer() {
    limparIntervalo();
    setEstado("nao_iniciado");
    setLiberarEm(null);
    setRestante(0);
  }
  
 // ✅ Função para inativar assinatura expirada
const inativarAssinaturaSeExpirada = useCallback(async () => {
  try {
    const res = await fetch("/api/assinaturas/me", { method: "GET" });
    if (!res.ok) return;

    const dados = await res.json();
    if (!dados?.assinatura) return;

    const { periodo_fim, status, id } = dados.assinatura;
    if (!periodo_fim || status !== "ativa") return;

    const agora = new Date();
    if (new Date(periodo_fim) < agora) {
      // Assinatura expirada, inativa
      await fetch("/api/assinaturas/inativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assinaturaId: id }),
      });
    }
  } catch {
    // falha silenciosa
  }
}, []);

  const buscarStatus = useCallback(async () => {
    setCarregando(true);
    try {
      await inativarAssinaturaSeExpirada(); // verifica assinatura antes de buscar status

      if (assinanteAtivo) {
        limparIntervalo();
        setEstado("nao_iniciado");
        setLiberarEm(null);
        setRestante(0);
        return;
      }

      if (!slug || slug === "undefined") {
        setEstado("nao_iniciado");
        setLiberarEm(null);
        setRestante(0);
        return;
      }

      // ✅ agora manda tipo também
      const res = await fetch(
        `/api/download-gratis/status?slug=${encodeURIComponent(slug)}&tipo=${encodeURIComponent(tipo)}`,
        { method: "GET" }
      );

      const jsonRaw = await res.json().catch(() => null);
      const json = parseStatus(jsonRaw);

      if (!res.ok || !json.status) {
        setEstado("nao_iniciado");
        setLiberarEm(null);
        setRestante(0);
        return;
      }

      if (json.status === "nao_iniciado" || json.status === "sem_login") {
        setEstado("nao_iniciado");
        setLiberarEm(null);
        setRestante(0);
        return;
      }

      if (json.status === "contando" && json.liberar_em) {
        setEstado("aguardando");
        iniciarContador(json.liberar_em);
        return;
      }

      if (json.status === "liberado" && json.liberar_em) {
        setEstado("liberado");
        setLiberarEm(json.liberar_em);
        setRestante(0);
        return;
      }

      setEstado("nao_iniciado");
      setLiberarEm(null);
      setRestante(0);
    } finally {
      setCarregando(false);
    }
  }, [assinanteAtivo, inativarAssinaturaSeExpirada, iniciarContador, limparIntervalo, slug, tipo]);

  useEffect(() => {
    void buscarStatus();
    return () => limparIntervalo();
  }, [buscarStatus, limparIntervalo]);

  async function iniciarGratis() {
    const res = await fetch("/api/download-gratis/iniciar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ✅ agora manda tipo também
      body: JSON.stringify({ slug, tipo }),
    });

    const jsonRaw = await res.json().catch(() => null);
    const json = parseStatus(jsonRaw);

    if (!res.ok) {
      throw new Error(json.erro ?? "Não foi possível iniciar a contagem.");
    }

    const liberar_em = extrairLiberarEmDoIniciar(jsonRaw);
    if (!liberar_em) {
      throw new Error("Resposta inválida do servidor (liberar_em ausente).");
    }

    setEstado("aguardando");
    iniciarContador(liberar_em);
  }

  async function tentarBaixarDireto() {
    const res = await fetch("/api/download-gratis/baixar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ✅ agora manda tipo também
      body: JSON.stringify({ slug, tipo }),
    });

    const jsonRaw = await res.json().catch(() => null);
    const json = parseStatus(jsonRaw);

    if (res.status === 401) {
      window.location.href = `/login?retorno=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    if (res.ok) {
  const url =
    jsonRaw && typeof jsonRaw === "object"
      ? (jsonRaw as Record<string, unknown>).url
      : null;

  if (typeof url !== "string" || !url) {
    throw new Error("Resposta inválida do servidor (url ausente).");
  }

  // ✅ CONSOME o estado "liberado"
  resetarTimer();

  // dispara o download
  window.open(url, "_blank", "noopener,noreferrer");
  return;
}


    if (json.liberar_em) {
      const s = segundosRestantes(json.liberar_em);
      if (s > 0) {
        setEstado("aguardando");
        iniciarContador(json.liberar_em);
      } else {
        setEstado("liberado");
        setLiberarEm(json.liberar_em);
        setRestante(0);
      }
      return;
    }

    throw new Error(json.erro ?? "Não foi possível baixar agora.");
  }

  async function aoClicar() {
    if (clicando) return;
    setClicando(true);

    try {
      await tentarBaixarDireto();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado.";

      if (msg.toLowerCase().includes("inicie a contagem")) {
        try {
          await iniciarGratis();
        } catch (e2) {
          alert(e2 instanceof Error ? e2.message : "Erro inesperado.");
        }
      } else {
        alert(msg);
      }
    } finally {
      setClicando(false);
    }
  }

  let texto = "Baixar";
  if (carregando) texto = "Carregando...";
  else if (assinanteAtivo) texto = "Baixar agora";
  else if (estado === "nao_iniciado") texto = "Baixar";
  else if (estado === "aguardando") texto = `Liberando em ${formatarTempo(restante)}`;
  else if (estado === "liberado") texto = "Baixar agora";

  const desabilitado = useMemo(() => {
    return clicando || (!assinanteAtivo && estado === "aguardando");
  }, [clicando, estado, assinanteAtivo]);

    // ✅ Quando estiver aguardando, troca o botão por loader + contador
    if (!assinanteAtivo && estado === "aguardando") {
      return (
        <div className="relative w-full flex items-center justify-center py-6">
          <div className="relative -translate-y-2">
            <div className="download-loader2" aria-hidden="true">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <defs>
                  <mask id="dl2-clipping">
                    <polygon points="0,0 100,0 100,100 0,100" fill="black"></polygon>
                    <polygon points="25,25 75,25 50,75" fill="white"></polygon>
                    <polygon points="50,25 75,75 25,75" fill="white"></polygon>
                    <polygon points="35,35 65,35 50,65" fill="white"></polygon>
                    <polygon points="35,35 65,35 50,65" fill="white"></polygon>
                    <polygon points="35,35 65,35 50,65" fill="white"></polygon>
                    <polygon points="35,35 65,35 50,65" fill="white"></polygon>
                  </mask>
                </defs>
              </svg>
              <div className="dl2-box"></div>
            </div>
  
            {/* contador em cima */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-extrabold tracking-tight text-sm md:text-base">
                {formatarTempo(restante)}
              </span>
            </div>
          </div>
        </div>
      );
    }
  

  const tooltipLiberacao = liberarEm ? `Liberado em: ${new Date(liberarEm).toLocaleString("pt-BR")}` : undefined;

  return (
    <button
      type="button"
      onClick={() => void aoClicar()}
      disabled={desabilitado}
      className={`btn ${desabilitado ? "btn--disabled" : ""} ${className}`.trim()}
      aria-busy={carregando || clicando}
      title={tooltipLiberacao}
    >
      <strong>{texto}</strong>

      <div id="container-stars">
        <div id="stars"></div>
      </div>

      <div id="glow">
        <div className="circle"></div>
        <div className="circle"></div>
      </div>
    </button>
  );
}
