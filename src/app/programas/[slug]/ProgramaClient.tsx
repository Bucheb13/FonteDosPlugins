"use client";

import { useEffect, useMemo, useState } from "react";
import { criarSupabaseNavegador } from "@/lib/supabase-navegador";
import { BotaoDownloadUnico } from "@/components/BotaoDownloadUnico/BotaoDownloadUnico";
import { CardCatalogo } from "@/components/CardCatalogo";
import PillTabs from "@/components/PillTabs/PillTabs";
import Card3D from "@/components/Card3D/Card3D";

type Programa = {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
  descricao: string | null;
  tipo_instalacao: "video" | "texto";
  conteudo_instalacao: string | null;
  ativo: boolean;
};

type Aba = "descricao" | "instalacao" | "relacionados";

type ProgramaClientProps = {
  slug: string;
};

type DownloadAggRow = {
  item_id: string;
  downloads: number | string;
};

type TopPrograma = {
  id: string;
  slug: string;
  nome: string;
  imagem_capa_url: string | null;
  downloads: number;
};

function youtubeToEmbed(url: string) {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }

    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    return null;
  } catch {
    return null;
  }
}

function isArray<T>(v: unknown): v is T[] {
  return Array.isArray(v);
}

export default function ProgramaClient({ slug }: ProgramaClientProps) {
  const supabase = useMemo(() => criarSupabaseNavegador(), []);

  const [programa, setPrograma] = useState<Programa | null>(null);
  const [programasRelacionados, setProgramasRelacionados] = useState<Programa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [abaAtiva, setAbaAtiva] = useState<Aba>("descricao");

  const [topProgramas, setTopProgramas] = useState<TopPrograma[]>([]);
  const [carregandoTop, setCarregandoTop] = useState(false);

  const temConteudoInstalacao = Boolean(programa?.conteudo_instalacao?.trim());

  const tabs = useMemo(() => {
    const t: { key: Aba; label: string }[] = [];
    t.push({ key: "descricao", label: "descrição" });
    if (temConteudoInstalacao) t.push({ key: "instalacao", label: "Instalação" });
    t.push({ key: "relacionados", label: "Você pode gostar também" });
    return t;
  }, [temConteudoInstalacao]);

  useEffect(() => {
    if (!programa) return;

    if (!temConteudoInstalacao && abaAtiva === "instalacao") {
      setAbaAtiva("descricao");
    }
  }, [programa, temConteudoInstalacao, abaAtiva]);

  /* CARREGAR PROGRAMA */
  useEffect(() => {
    if (!slug) return;

    (async () => {
      setCarregando(true);
      setMensagem(null);

      try {
        const res = await fetch(`/api/programas?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          setPrograma(null);
          setMensagem("Programa não encontrado.");
          return;
        }

        const json = (await res.json()) as { programa: Programa };
        setPrograma(json.programa ?? null);
      } catch {
        setPrograma(null);
        setMensagem("Erro ao carregar programa.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [slug]);

  /* RELACIONADOS */
  useEffect(() => {
    if (!programa) return;

    (async () => {
      try {
        const res = await fetch(`/api/programas?limit=8&exclude=${programa.slug}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const json = (await res.json()) as { programas: Programa[] };

        const lista = (json.programas ?? []).filter(
          (p) => p.slug !== programa.slug && p.id !== programa.id
        );

        setProgramasRelacionados(lista);
      } catch {
        // silencioso
      }
    })();
  }, [programa]);

  /* TOP 6 (via RPC) */
  useEffect(() => {
    if (abaAtiva !== "descricao") return;
    if (topProgramas.length > 0) return;

    (async () => {
      setCarregandoTop(true);
      try {
        const { data: agg, error: aggErr } = await supabase.rpc("top_downloads", {
          p_tipo: "programa",
          p_limit: 6,
        });

        if (aggErr) {
          console.error("[TOP6-PROGRAMA] rpc error:", aggErr);
          setTopProgramas([]);
          return;
        }

        if (!isArray<DownloadAggRow>(agg)) {
          console.warn("[TOP6-PROGRAMA] rpc formato inesperado:", agg);
          setTopProgramas([]);
          return;
        }

        const rows = agg
          .map((r: DownloadAggRow) => ({
            item_id: String(r.item_id),
            downloads: Number(r.downloads ?? 0),
          }))
          .filter((r) => r.item_id.length > 0);

        const ids = rows.map((r) => r.item_id);
        if (ids.length === 0) {
          setTopProgramas([]);
          return;
        }

        const { data: progs, error: progsErr } = await supabase
          .from("programas")
          .select("id, slug, nome, imagem_capa_url")
          .in("id", ids);

        if (progsErr) {
          console.error("[TOP6-PROGRAMA] programas error:", progsErr);
          setTopProgramas([]);
          return;
        }

        if (
          !isArray<{ id: string; slug: string; nome: string; imagem_capa_url: string | null }>(
            progs
          )
        ) {
          console.warn("[TOP6-PROGRAMA] programas formato inesperado:", progs);
          setTopProgramas([]);
          return;
        }

        const byId = new Map(progs.map((p) => [String(p.id), p]));

        const finalList: TopPrograma[] = rows
          .map((r) => {
            const info = byId.get(r.item_id);
            if (!info) return null;

            return {
              id: String(info.id),
              slug: String(info.slug),
              nome: String(info.nome),
              imagem_capa_url: info.imagem_capa_url ?? null,
              downloads: Number(r.downloads ?? 0),
            };
          })
          .filter((x: TopPrograma | null): x is TopPrograma => x !== null);

        setTopProgramas(finalList);
      } finally {
        setCarregandoTop(false);
      }
    })();
  }, [abaAtiva, supabase, topProgramas.length]);

  if (carregando) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 pt-6 pb-10">
        <div className="rounded-[32px] border border-white/12 bg-black/35 p-6 text-sm text-white/75 backdrop-blur-md">
          Carregando programa…
        </div>
      </div>
    );
  }

  if (!programa) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 pt-6 pb-10">
        <div className="rounded-[32px] border border-white/12 bg-black/35 p-6 text-sm text-white/75 backdrop-blur-md">
          {mensagem ?? "Programa não encontrado."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 pt-6 pb-10">
      <div className="flex flex-col gap-6">
        {/* HERO */}
        <section
          className="relative overflow-hidden rounded-[32px] border border-white/12 bg-white/[0.02]
          min-h-[320px] sm:min-h-[380px] md:min-h-[560px]"
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{
              backgroundImage: programa.imagem_capa_url
                ? `url('${programa.imagem_capa_url}')`
                : "linear-gradient(90deg,#111827,#0f172a)",
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.06),transparent_20%),radial-gradient(ellipse_at_bottom_right,rgba(236,72,153,0.05),transparent_20%)]" />

          <div className="pointer-events-none absolute -top-36 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[160px]" />
          <div className="pointer-events-none absolute -bottom-36 right-[-80px] h-[420px] w-[420px] rounded-full bg-fuchsia-500/8 blur-[100px]" />

          <div
            className="relative flex h-full flex-col
            min-h-[320px] sm:min-h-[380px] md:min-h-[560px]
            p-5 sm:p-6 md:p-10"
          >
            <div className="mt-auto flex flex-col items-center text-center">
              <h1 className="text-2xl sm:text-3xl md:text-5xl leading-[1.05] tracking-tight font-extrabold text-white">
                {programa.nome}
              </h1>

              {programa.subtitulo && (
                <p className="mt-3 max-w-3xl text-white/80 text-base sm:text-lg">
                  {programa.subtitulo}
                </p>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 opacity-[0.10] noise-overlay" />
          <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/10" />
        </section>

        {/* DOWNLOAD */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/15 bg-black/55 backdrop-blur-xl p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent" />
          <div className="pointer-events-none absolute -left-28 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-cyan-500/30 blur-[160px]" />
          <div className="pointer-events-none absolute -right-28 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-fuchsia-500/25 blur-[160px]" />

          {/* tablet empilha; desktop segue lado a lado */}
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 md:ml-4 lg:ml-12">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Download {programa.nome}
              </h2>

              <div className="mt-4 space-y-2 text-sm md:text-base text-white/80">
                <p>
                  <span className="font-semibold text-white">Quem fortalece o site</span>{" "}
                  baixa na hora
                </p>
                <p>
                  <span className="font-semibold text-white">Free</span> libera em 15 minutos
                </p>
              </div>

              <p className="mt-4 text-xs md:text-sm text-white/60">
                Quer baixar sem esperar? Dá essa força pro site continuar no ar!
              </p>
            </div>

            <div className="w-full sm:max-w-[420px] lg:w-[360px]">
              <BotaoDownloadUnico slug={programa.slug} tipo="programa" />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 opacity-[0.1] noise-overlay" />
          <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/10" />
        </section>

        {/* ABAS + CONTEÚDO */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/12 bg-black/35 backdrop-blur-md isolate">
          <div className="rain-bg rounded-[32px]" />

          <div className="relative z-10 p-6 md:p-8">
            <PillTabs<Aba>
              name="programa-tabs"
              abaAtiva={abaAtiva}
              setAbaAtiva={setAbaAtiva}
              tabs={tabs}
            />

            <div className="mt-6">
              {abaAtiva === "descricao" && (
                <div className="lg:grid lg:grid-cols-12 lg:gap-6">
                  {/* ESQUERDA: DESCRIÇÃO */}
                  <section className="lg:col-span-6">
                    <div className="rounded-[24px] border border-white/10 bg-black/35 p-4 backdrop-blur">
                      <div className="text-white/80 whitespace-pre-line leading-snug text-sm text-left">
                        {programa.descricao ? (
                          programa.descricao
                        ) : (
                          <p className="text-white/50">
                            Este programa ainda não possui descrição.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* DIREITA: TOP 6 */}
                  <aside className="mt-6 lg:mt-0 lg:col-span-6 lg:col-start-7">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white/90">
                        Top 6 programas mais baixados
                      </h3>
                      {carregandoTop && (
                        <span className="text-xs text-white/50">carregando…</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {topProgramas.map((p) => (
                        <Card3D
                          key={p.id}
                          titulo={p.nome}
                          imagemUrl={p.imagem_capa_url ?? null}
                          href={`/programas/${p.slug}`}
                        />
                      ))}

                      {!carregandoTop && topProgramas.length === 0 && (
                        <div className="text-sm text-white/50">Sem dados no momento.</div>
                      )}
                    </div>
                  </aside>
                </div>
              )}

              {abaAtiva === "instalacao" && temConteudoInstalacao && (
                <div>
                  {programa.tipo_instalacao === "video" ? (
                    programa.conteudo_instalacao ? (
                      <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
                        {(() => {
                          const embedUrl = youtubeToEmbed(programa.conteudo_instalacao!);
                          return embedUrl ? (
                            <div className="relative aspect-video w-full">
                              <iframe
                                src={embedUrl}
                                title={`Instalação - ${programa.nome}`}
                                className="absolute inset-0 h-full w-full"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <div className="p-4 text-sm text-white/60">
                              Vídeo de instalação inválido.
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="text-white/50">
                        Este programa ainda não possui vídeo de instalação.
                      </p>
                    )
                  ) : programa.conteudo_instalacao ? (
                    <div className="whitespace-pre-line text-white/80 leading-snug text-sm">
                      {programa.conteudo_instalacao}
                    </div>
                  ) : (
                    <p className="text-white/50">
                      Nenhuma instrução de instalação disponível.
                    </p>
                  )}
                </div>
              )}

              {abaAtiva === "relacionados" && (
                <div>
                  {programasRelacionados.length === 0 ? (
                    <p className="text-white/50">
                      Nenhuma sugestão disponível no momento.
                    </p>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {programasRelacionados.map((p) => (
                        <CardCatalogo
                          key={p.id}
                          item={{
                            id: p.id,
                            slug: p.slug,
                            nome: p.nome,
                            subtitulo: p.subtitulo,
                            imagem_capa_url: p.imagem_capa_url,
                          }}
                          hrefBase="/programas"
                          etiqueta="Programa"
                          subcategoria={null}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 opacity-[0.10] noise-overlay" />
          <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/10" />
        </section>
      </div>
    </div>
  );
}