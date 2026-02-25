"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { CardCatalogo } from "@/components/CardCatalogo";
import { SearchGlow } from "@/components/SearchGlow/SearchGlow";
import BotaoGradiente from "@/components/BotaoGradiente/BotaoGradiente";
import PillTabs from "@/components/PillTabs/PillTabs";

type Aba = "todos";

type Daw = {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
};

type Props = {
  titulo?: string;
  subtituloHeader?: string;
  mostrarAssinatura?: boolean;
  hrefAssinatura?: string;
  ranking?: ReactNode; // ✅ vem do server (igual PluginsClient)
};

function normalizar(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function lerJsonComSeguranca(res: Response) {
  const texto = await res.text();
  try {
    return texto ? JSON.parse(texto) : {};
  } catch {
    return { erro: texto || "Resposta inválida do servidor" };
  }
}

export default function DawsClient({
  titulo = "DAWs",
  subtituloHeader = "Apoie o site para liberar o download imediatamente!",
  hrefAssinatura = "/assinaturas",
  ranking,
}: Props) {
  const router = useRouter();

  const [daws, setDaws] = useState<Daw[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [pesquisa, setPesquisa] = useState("");

  // debounce
  const [debouncedPesquisa, setDebouncedPesquisa] = useState(pesquisa);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedPesquisa(pesquisa), 450);
    return () => clearTimeout(t);
  }, [pesquisa]);

  const buscarDaws = useCallback(async (query: string) => {
    setCarregando(true);
    setErro("");

    try {
      const url = new URL("/api/daws", window.location.origin);
      if (query) url.searchParams.set("q", query);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await lerJsonComSeguranca(res);

      if (!res.ok) {
        setErro(data?.erro ?? "Erro ao carregar DAWs");
        setDaws([]);
        return;
      }

      if (data?.erro) {
        setErro(data.erro);
        setDaws([]);
      } else {
        setDaws(data?.daws ?? []);
      }
    } catch {
      setErro("Erro ao carregar DAWs");
      setDaws([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void buscarDaws(debouncedPesquisa);
  }, [debouncedPesquisa, buscarDaws]);

  const placeholder = "Busque por DAWs...";
  const qNorm = normalizar(pesquisa.trim());

  const abaAtiva: Aba = "todos";

  const tabs = useMemo(
    () => [{ key: "todos" as const, label: "Todos" }],
    []
  );

  const setAbaAtiva = () => {
    // mantém compatível com o PillTabs e abre espaço p/ futuras tabs
    router.push("/daws");
  };

  return (
    <div className="relative">
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 pt-6 pb-6 md:pt-4 md:pb-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/12 bg-black/35 backdrop-blur-md">
          <div
            className="absolute inset-0 opacity-50 bg-cover bg-center"
            style={{ backgroundImage: "url('/imagens/banner-destaque.webp')" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/75 to-black/90" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.10] noise-overlay" />
          <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/10" />

          <div className="pointer-events-none absolute -top-20 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-cyan-500/12 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-24 right-[-80px] h-[360px] w-[360px] rounded-full bg-fuchsia-500/10 blur-[110px]" />

          <div className="relative z-10 px-6 py-7 md:px-10 md:py-9">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs font-semibold text-white/85 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-green-400/80" />
                Catálogo verificado • Downloads por torrent
              </div>

              <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-white text-shadow-strong">
                {titulo} <span className="text-white/70">para elevar sua produção</span>
              </h1>

              <p className="mt-2 max-w-2xl text-sm md:text-base text-white/75 text-shadow-soft">
                {subtituloHeader}
              </p>

              <div className="mt-5 flex justify-center">
                <BotaoGradiente href={hrefAssinatura}>
                  Apoiar via Pix e baixar sem espera
                </BotaoGradiente>
              </div>
            </div>

            {/* PillTabs + ações + busca */}
            <div className="mt-6 flex flex-col items-center gap-4">
              <PillTabs<Aba>
                name="daws-categoria"
                abaAtiva={abaAtiva}
                setAbaAtiva={setAbaAtiva}
                tabs={tabs}
                className="opacity-100"
              />

              {pesquisa.trim() && (
                <button
                  type="button"
                  onClick={() => setPesquisa("")}
                  className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur hover:bg-black/50 hover:border-white/30 transition"
                >
                  Limpar busca
                </button>
              )}

              <div className="relative w-full max-w-[720px]">
                <SearchGlow value={pesquisa} onChange={setPesquisa} placeholder={placeholder} />
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-white/50">
                  {qNorm ? "filtrando…" : "busca rápida"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LISTA */}
        <section className="mx-auto w-full max-w-7xl mt-8">
          {carregando && (
            <div className="rounded-3xl border border-white/12 bg-black/40 p-5 text-sm text-white/75 backdrop-blur-md">
              Carregando DAWs...
            </div>
          )}

          {erro && (
            <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200 backdrop-blur-md">
              {erro}
            </div>
          )}

          {!carregando && !erro && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {daws.length === 0 ? (
                <div className="col-span-full rounded-3xl border border-white/12 bg-black/40 p-6 text-sm text-white/70 backdrop-blur-md">
                  Nenhuma DAW encontrada.
                </div>
              ) : (
                daws.map((d) => (
                  <CardCatalogo
                    key={d.id}
                    item={{
                      id: d.id,
                      slug: d.slug,
                      nome: d.nome,
                      subtitulo: d.subtitulo,
                      imagem_capa_url: d.imagem_capa_url,
                    }}
                    hrefBase="/daws"
                    etiqueta="DAW"
                    subcategoria={null}
                  />
                ))
              )}
            </div>
          )}
        </section>

        {ranking}
      </div>
    </div>
  );
}
