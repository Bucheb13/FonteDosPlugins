"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ModalRedefinirSenha } from "@/components/ModalRedefinirSenha";
import "./InfoCubes.css";
import "./DownloadsCarousel.css";

type StatusAssinatura = "ativa" | "inativa";
type ItemTipo = "plugin" | "drum-kit" | "daw" | "programa";

type ItemResolvido = {
  id: string;
  nome: string;
  slug: string;
  imagem_capa_url: string | null;
  tipo: ItemTipo;
};

type DownloadFinal = {
  id: string;
  criado_em: string;
  item?: ItemResolvido;
};

type DadosMinhaConta = {
  usuario: {
    email: string;
    user_metadata?: { display_name?: string };
  };
  statusAssinatura: StatusAssinatura;
  labelAssinatura: string;
  totalDownloads: number;
  listaDownloads: DownloadFinal[];
};

/* =========================
   HELPERS
========================= */
function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function labelTipo(tipo: ItemTipo) {
  switch (tipo) {
    case "plugin":
      return "Plugin";
    case "drum-kit":
      return "Drum-Kit";
    case "daw":
      return "DAW";
    case "programa":
      return "Programa";
  }
}

function formatarEmail(email: string) {
  return email.toLowerCase();
}

/* =========================
   INFO CUBES
========================= */
type CubeTone = "cyan" | "pink" | "purple" | "emerald";

type CubeStyleVars = React.CSSProperties & {
  ["--glow"]?: string; // rgb: "r,g,b"
  ["--text"]?: string; // rgb
  ["--c1"]?: string;
  ["--c2"]?: string;
  ["--c3"]?: string;
  ["--c4"]?: string;
  ["--c5"]?: string;
};

function cubeStyle(tone: CubeTone): CubeStyleVars {
  switch (tone) {
    case "cyan":
      return {
        "--glow": "34,211,238",
        "--text": "220,255,255",
        "--c1": "34,211,238",
        "--c2": "255,110,196",
        "--c3": "168,85,247",
        "--c4": "34,211,238",
        "--c5": "255,110,196",
      };
    case "pink":
      return {
        "--glow": "255,110,196",
        "--text": "255,235,245",
        "--c1": "255,110,196",
        "--c2": "34,211,238",
        "--c3": "168,85,247",
        "--c4": "255,110,196",
        "--c5": "34,211,238",
      };
    case "purple":
      return {
        "--glow": "168,85,247",
        "--text": "245,235,255",
        "--c1": "168,85,247",
        "--c2": "34,211,238",
        "--c3": "255,110,196",
        "--c4": "168,85,247",
        "--c5": "34,211,238",
      };
    case "emerald":
      return {
        "--glow": "52,211,153",
        "--text": "235,255,245",
        "--c1": "52,211,153",
        "--c2": "34,211,238",
        "--c3": "168,85,247",
        "--c4": "52,211,153",
        "--c5": "34,211,238",
      };
  }
}

function FaceContent({ label, value }: { label: string; value: string }) {
  return (
    <div className="faceInner">
      <div className="cubeLabel">{label}</div>
      <div className="cubeValue">{value}</div>
    </div>
  );
}

function InfoCube({ label, value, tone }: { label: string; value: string; tone: CubeTone }) {
  const styleVars = cubeStyle(tone);

  return (
    <div className="cubeContainer" style={styleVars} aria-label={`${label}: ${value}`}>
      <div className="cube3d" aria-hidden="true">
        <div className="face front">
          <FaceContent label={label} value={value} />
        </div>
        <div className="face back">
          <FaceContent label={label} value={value} />
        </div>
        <div className="face right">
          <FaceContent label={label} value={value} />
        </div>
        <div className="face left">
          <FaceContent label={label} value={value} />
        </div>
        <div className="face top">
          <FaceContent label={label} value={value} />
        </div>
        <div className="face bottom">
          <FaceContent label={label} value={value} />
        </div>
      </div>
    </div>
  );
}

/* =========================
   DOWNLOADS 3D
========================= */
type CSSVars = React.CSSProperties & {
  "--quantity"?: number;
  "--radius"?: string;
  "--index"?: number;
  "--color"?: string;
};

/* =========================
   PAGINA
========================= */
export default function PaginaMinhaConta() {
  const [dados, setDados] = useState<DadosMinhaConta | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      const res = await fetch("/api/minha-conta");
      if (!res.ok) {
        window.location.href = "/login?retorno=/minha-conta";
        return;
      }
      const json: DadosMinhaConta = await res.json();
      if (!ativo) return;
      setDados(json);
    }

    carregarDados();
    return () => {
      ativo = false;
    };
  }, []);

  // ✅ Hook sempre roda (sem condicional)
  const qtdDownloads = dados?.listaDownloads.length ?? 0;

  const radius = useMemo(() => {
    if (qtdDownloads <= 0) return "260px";
    return `${Math.max(240, Math.min(420, qtdDownloads * 22))}px`;
  }, [qtdDownloads]);

  if (!dados) {
    return (
      <main className="min-h-[calc(100vh-64px)] grid place-items-center px-4">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl text-center">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[110px]" />
            <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-pink-500/10 blur-[110px]" />
  
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border border-white/20 border-t-white/80 animate-spin" />
  
            <h1 className="text-xl font-semibold tracking-tight text-white">Minha conta</h1>
            <p className="mt-1 text-sm text-white/60">Carregando seus dados…</p>
  
            <div className="mt-6 h-[1px] w-40 mx-auto bg-gradient-to-r from-cyan-400/60 via-purple-500/40 to-pink-500/60" />
  
            <div className="mt-6 grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl border border-white/10 bg-white/5 relative overflow-hidden"
                >
                  <div className="fdpShimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }
  
  

  const nomeExibicao =
    dados.usuario.user_metadata?.display_name?.trim() ||
    dados.usuario.email.split("@")[0].toLowerCase() ||
    "usuário";

  const emailExibicao = formatarEmail(dados.usuario.email);

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-10 grid place-items-center">
      {/* ✅ Conteúdo centralizado na página */}
      <div className="w-full max-w-6xl">
        {/* TOP AREA */}
        <header className="mb-10 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
            Minha conta
          </h1>
        </header>
  
        {/* INFO CUBES */}
        <section className="cubesGrid">
          <InfoCube label="Nome" value={nomeExibicao} tone="cyan" />
          <InfoCube label="Email" value={emailExibicao} tone="pink" />
          <InfoCube label="Downloads" value={String(dados.totalDownloads ?? 0)} tone="purple" />
          <InfoCube label="Assinatura" value={dados.labelAssinatura} tone="emerald" />
        </section>
  
        {/* ACTIONS */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setModalAberto(true)}
            className="
              group relative overflow-hidden rounded-xl
              border border-white/15 bg-white/5
              px-5 py-2 text-sm font-medium
              transition hover:scale-[1.03]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60
              neon-pulse
            "
          >
            <span className="relative z-10">Redefinir senha</span>
            <span className="absolute inset-0 bg-gradient-to-r from-purple-500/25 to-cyan-500/25 opacity-0 transition group-hover:opacity-100" />
          </button>
  
          {dados.statusAssinatura === "inativa" ? (
            <Link
              href="/assinaturas"
              className="
                group relative overflow-hidden rounded-xl
                bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500
                px-6 py-2 text-sm text-black font-semibold
                transition hover:scale-[1.05]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/60
                neon-pulse
              "
            >
              <span className="relative z-10 flex items-center gap-2">⚡ Assinar agora</span>
              <span className="absolute inset-0 blur-xl opacity-50 group-hover:opacity-80 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
            </Link>
          ) : (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs text-emerald-300 neon-pulse">
              ✔ {dados.labelAssinatura}
            </span>
          )}
        </div>
  
        {/* ✅ DOWNLOADS */}
        <section className="mt-14">
          {/* Header centralizado */}
          <div className="text-center">
            <h2 className="text-xl font-semibold tracking-tight text-white">Meus downloads</h2>
            <div className="mt-2 h-[1px] w-44 mx-auto bg-gradient-to-r from-cyan-400/60 via-purple-500/40 to-pink-500/60" />
            <div className="mt-3 text-xs text-white/60">
              {dados.totalDownloads ?? 0} no total
            </div>
          </div>
  
          <div className="mt-6">
            {dados.listaDownloads.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-sm text-white/70 backdrop-blur-xl">
                Nenhum download encontrado
              </div>
            ) : (
              <>
                {/* ✅ MOBILE: LISTA */}
                <ul className="space-y-3 md:hidden">
                  {dados.listaDownloads.map((d) => (
                    <li
                      key={d.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
                    >
                      {d.item?.imagem_capa_url ? (
                        <div
                          className="downloadItemThumb"
                          style={{ backgroundImage: `url(${d.item.imagem_capa_url})` }}
                          aria-hidden="true"
                        />
                      ) : (
                        <div className="downloadItemThumb downloadItemThumbFallback" aria-hidden="true">
                          <span>Sem capa</span>
                        </div>
                      )}

                      <div className="text-sm font-semibold text-white/90">
                        {d.item?.nome ?? "Item removido"}
                      </div>
  
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-white/60">
                        <span>{formatarData(d.criado_em)}</span>
  
                        {d.item?.tipo && (
                          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 uppercase tracking-widest text-[10px]">
                            {labelTipo(d.item.tipo)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
  
                {/* ✅ DESKTOP: 3D RING centralizado */}
                <div className="hidden md:flex downloads3dWrapper">
                  <div
                    className="downloads3dInner"
                    style={
                      {
                        "--quantity": dados.listaDownloads.length,
                        "--radius": radius,
                      } as CSSVars
                    }
                  >
                    {dados.listaDownloads.map((d, i) => {
                      const cores = [
                        "34,211,238",
                        "168,85,247",
                        "255,110,196",
                        "52,211,153",
                        "244,114,182",
                        "99,102,241",
                        "250,204,21",
                        "14,165,233",
                      ];
                      const cor = cores[i % cores.length];
  
                      return (
                        <div
                          key={d.id}
                          className="downloadCard"
                          style={{ "--index": i, "--color": cor } as CSSVars}
                          title={d.item?.nome ?? "Item removido"}
                        >
                          <div className="downloadCardContent">
                            <div>
                              {d.item?.imagem_capa_url ? (
                                <div
                                  className="downloadThumb"
                                  style={{ backgroundImage: `url(${d.item.imagem_capa_url})` }}
                                  aria-hidden="true"
                                />
                              ) : (
                                <div className="downloadThumb downloadThumbFallback" aria-hidden="true">
                                  <span>Sem capa</span>
                                </div>
                              )}

                              <div className="downloadTitle">{d.item?.nome ?? "Item removido"}</div>
                              <div className="downloadMeta">{formatarData(d.criado_em)}</div>
                            </div>
  
                            {d.item?.tipo && (
                              <div className="downloadType">{labelTipo(d.item.tipo)}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
  
        {/* modal no final */}
        <ModalRedefinirSenha aberto={modalAberto} onFechar={() => setModalAberto(false)} />
      </div>
    </main>
  );
  
}
