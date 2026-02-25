"use client";

import { useEffect, useMemo, useState } from "react";
import { criarSupabaseNavegador } from "@/lib/supabase-navegador";
import { BotaoDownloadUnico } from "@/components/BotaoDownloadUnico/BotaoDownloadUnico";
import { CardCatalogo } from "@/components/CardCatalogo";
import PillTabs from "@/components/PillTabs/PillTabs";
import Card3D from "@/components/Card3D/Card3D";

type Daw = {
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

type DawClientProps = {
  slug: string;
};

// RPC retorna item_id + downloads
type DownloadAggRow = {
  item_id: string;
  downloads: number | string;
};

// Top 6 (com imagem)
type TopDaw = {
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

export default function DawClient({ slug }: DawClientProps) {
  const supabase = useMemo(() => criarSupabaseNavegador(), []);

  const [daw, setDaw] = useState<Daw | null>(null);
  const [dawsRelacionados, setDawsRelacionados] = useState<Daw[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [abaAtiva, setAbaAtiva] = useState<Aba>("descricao");

  // Top 6
  const [topDaws, setTopDaws] = useState<TopDaw[]>([]);
  const [carregandoTop, setCarregandoTop] = useState(false);

  const temConteudoInstalacao = Boolean(daw?.conteudo_instalacao?.trim());

  const tabs = useMemo(() => {
    const t: { key: Aba; label: string }[] = [];

    t.push({ key: "descricao", label: "descrição" });
    if (temConteudoInstalacao) t.push({ key: "instalacao", label: "Instalação" });
    t.push({ key: "relacionados", label: "Você pode gostar também" });

    return t;
  }, [temConteudoInstalacao]);

  useEffect(() => {
    if (!daw) return;

    // se não tem conteudo, não pode ficar na aba instalação
    if (!temConteudoInstalacao && abaAtiva === "instalacao") {
      setAbaAtiva("descricao");
    }
  }, [daw, temConteudoInstalacao, abaAtiva]);

  /* CARREGAR DAW */
  useEffect(() => {
    if (!slug) return;

    (async () => {
      setCarregando(true);
      setMensagem(null);

      try {
        const res = await fetch(`/api/daws?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          setDaw(null);
          setMensagem("Daw não encontrado.");
          return;
        }

        const json = (await res.json()) as { daw: Daw };
        setDaw(json.daw ?? null);
      } catch {
        setDaw(null);
        setMensagem("Erro ao carregar daw.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [slug]);

  /* RELACIONADOS */
  useEffect(() => {
    if (!daw) return;

    (async () => {
      try {
        const res = await fetch(`/api/daws?limit=8&exclude=${daw.slug}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const json = (await res.json()) as { daws: Daw[] };

        const lista = (json.daws ?? []).filter(
          (p) => p.slug !== daw.slug && p.id !== daw.id
        );

        setDawsRelacionados(lista);
      } catch {
        // silencioso
      }
    })();
  }, [daw]);

  /* TOP 6 (via RPC) — só quando entra na aba descrição */
  useEffect(() => {
    if (abaAtiva !== "descricao") return;
    if (topDaws.length > 0) return;

    (async () => {
      setCarregandoTop(true);
      try {
        // ⚠️ precisa existir no seu banco: top_downloads(p_tipo text, p_limit int)
        const { data: agg, error: aggErr } = await supabase.rpc("top_downloads", {
          p_tipo: "daw",
          p_limit: 6,
        });

        if (aggErr) {
          console.error("[TOP6-DAW] rpc error:", aggErr);
          setTopDaws([]);
          return;
        }

        if (!isArray<DownloadAggRow>(agg)) {
          console.warn("[TOP6-DAW] rpc formato inesperado:", agg);
          setTopDaws([]);
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
          setTopDaws([]);
          return;
        }

        const { data: daws, error: dawsErr } = await supabase
          .from("daws")
          .select("id, slug, nome, imagem_capa_url")
          .in("id", ids);

        if (dawsErr) {
          console.error("[TOP6-DAW] daws error:", dawsErr);
          setTopDaws([]);
          return;
        }

        if (
          !isArray<{ id: string; slug: string; nome: string; imagem_capa_url: string | null }>(
            daws
          )
        ) {
          console.warn("[TOP6-DAW] daws formato inesperado:", daws);
          setTopDaws([]);
          return;
        }

        const byId = new Map(daws.map((p) => [String(p.id), p]));

        const finalList: TopDaw[] = rows
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
          .filter((x: TopDaw | null): x is TopDaw => x !== null);

        setTopDaws(finalList);
      } finally {
        setCarregandoTop(false);
      }
    })();
  }, [abaAtiva, supabase, topDaws.length]);

  if (carregando) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 pt-6 pb-10">
        <div className="rounded-[32px] border border-white/12 bg-black/35 p-6 text-sm text-white/75 backdrop-blur-md">
          Carregando daw…
        </div>
      </div>
    );
  }

  if (!daw) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 pt-6 pb-10">
        <div className="rounded-[32px] border border-white/12 bg-black/35 p-6 text-sm text-white/75 backdrop-blur-md">
          {mensagem ?? "Daw não encontrado."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 pt-6 pb-10">
      <div className="flex flex-col gap-6">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/12 bg-white/[0.02] min-h-[500px] md:min-h-[560px]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{
              backgroundImage: daw.imagem_capa_url
                ? `url('${daw.imagem_capa_url}')`
                : "linear-gradient(90deg,#111827,#0f172a)",
              minHeight: "360px",
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.06),transparent 20%),radial-gradient(ellipse_at_bottom_right,rgba(236,72,153,0.05),transparent 20%)]" />

          <div className="pointer-events-none absolute -top-36 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[160px]" />
          <div className="pointer-events-none absolute -bottom-36 right-[-80px] h-[420px] w-[420px] rounded-full bg-fuchsia-500/8 blur-[100px]" />

          <div className="relative flex h-full min-h-[500px] md:min-h-[560px] flex-col p-6 md:p-10">
            <div className="mt-auto flex flex-col items-center text-center">
              <h1 className="text-3xl md:text-5xl leading-[1.02] tracking-tight font-extrabold text-white">
                {daw.nome}
              </h1>

              {daw.subtitulo && (
                <p className="mt-3 max-w-3xl text-white/80 text-lg">
                  {daw.subtitulo}
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

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 md:ml-4 lg:ml-12">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Download {daw.nome}
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

            <div className="w-full md:w-[360px]">
              <BotaoDownloadUnico slug={daw.slug} tipo="daw" />
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
              name="daw-tabs"
              abaAtiva={abaAtiva}
              setAbaAtiva={setAbaAtiva}
              tabs={tabs}
            />

            <div className="mt-6">
              {abaAtiva === "descricao" && (
                <div className="md:grid md:grid-cols-12 md:gap-6">
                  {/* ESQUERDA: DESCRIÇÃO */}
                  <section className="md:col-span-6">
                    <div className="rounded-[24px] border border-white/10 bg-black/35 p-4 backdrop-blur">
                      <div className="text-white/80 whitespace-pre-line leading-snug text-sm text-left">
                        {daw.descricao ? (
                          daw.descricao
                        ) : (
                          <p className="text-white/50">
                            Este daw ainda não possui descrição.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* DIREITA: TOP 6 */}
                  <aside className="mt-6 md:mt-0 md:col-span-6 md:col-start-7">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white/90">
                        Top 6 DAWs mais baixadas
                      </h3>
                      {carregandoTop && (
                        <span className="text-xs text-white/50">carregando…</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {topDaws.map((p) => (
                        <Card3D
                          key={p.id}
                          titulo={p.nome}
                          imagemUrl={p.imagem_capa_url ?? null}
                          href={`/daws/${p.slug}`}
                        />
                      ))}

                      {!carregandoTop && topDaws.length === 0 && (
                        <div className="text-sm text-white/50">
                          Sem dados no momento.
                        </div>
                      )}
                    </div>
                  </aside>
                </div>
              )}

              {abaAtiva === "instalacao" && temConteudoInstalacao && (
                <div>
                  {daw.tipo_instalacao === "video" ? (
                    daw.conteudo_instalacao ? (
                      <div className="relative h-[600px] overflow-hidden rounded-xl border border-white/10 bg-black/40">
                        {(() => {
                          const embedUrl = youtubeToEmbed(daw.conteudo_instalacao!);
                          return embedUrl ? (
                            <iframe
                              src={embedUrl}
                              title={`Instalação - ${daw.nome}`}
                              className="absolute inset-0 h-full w-full"
                              allowFullScreen
                            />
                          ) : (
                            <div className="p-4 text-sm text-white/60">
                              Vídeo de instalação inválido.
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="text-white/50">
                        Este daw ainda não possui vídeo de instalação.
                      </p>
                    )
                  ) : daw.conteudo_instalacao ? (
                    <div className="whitespace-pre-line text-white/80 leading-snug text-sm">
                      {daw.conteudo_instalacao}
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
                  {dawsRelacionados.length === 0 ? (
                    <p className="text-white/50">
                      Nenhuma sugestão disponível no momento.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {dawsRelacionados.map((p) => (
                        <CardCatalogo
                          key={p.id}
                          item={{
                            id: p.id,
                            slug: p.slug,
                            nome: p.nome,
                            subtitulo: p.subtitulo,
                            imagem_capa_url: p.imagem_capa_url,
                          }}
                          hrefBase="/daws"
                          etiqueta="DAW"
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
