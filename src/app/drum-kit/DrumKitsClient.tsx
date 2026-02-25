"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CardCatalogo } from "@/components/CardCatalogo";
import { SearchGlow } from "@/components/SearchGlow/SearchGlow";
import BotaoGradiente from "@/components/BotaoGradiente/BotaoGradiente";
import PillTabs from "@/components/PillTabs/PillTabs";
import type { ReactNode } from "react";

type CategoriaDrumKit = "drum-kit" | "sample-kit" | "midi-kit";
type Aba = "todos" | CategoriaDrumKit;

type DrumKit = {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
  categoria?: CategoriaDrumKit | null; // se sua API retornar
};

type Props = {
  categoria?: CategoriaDrumKit;
  titulo?: string;
  subtituloHeader?: string;
  mostrarAssinatura?: boolean;
  hrefAssinatura?: string;
  ranking?: ReactNode; // ✅ opcional (slot server -> client)
};

function normalizar(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function DrumKitsClient({
  categoria,
  titulo = "Drum-Kits",
  subtituloHeader = "Apoie o site para liberar o download imediatamente!",
  hrefAssinatura = "/assinaturas",
  ranking,
}: Props) {
  const router = useRouter();

  const [drumKits, setDrumKits] = useState<DrumKit[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [pesquisa, setPesquisa] = useState("");

  // debounce
  const [debouncedPesquisa, setDebouncedPesquisa] = useState(pesquisa);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedPesquisa(pesquisa), 450);
    return () => clearTimeout(t);
  }, [pesquisa]);

  const buscarDrumKits = async (query: string) => {
    setCarregando(true);
    setErro("");

    try {
      const url = new URL("/api/drum-kit", window.location.origin);
      if (query) url.searchParams.set("q", query);
      if (categoria) url.searchParams.set("categoria", categoria);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setErro(data?.erro ?? "Erro ao carregar Drum-Kits");
        setDrumKits([]);
        return;
      }

      if (data?.erro) {
        setErro(data.erro);
        setDrumKits([]);
      } else {
        setDrumKits(data?.drumKits ?? []);
      }
    } catch {
      setErro("Erro ao carregar Drum-Kits");
      setDrumKits([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarDrumKits(debouncedPesquisa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPesquisa, categoria]);

  const placeholder =
    categoria === "sample-kit"
      ? "Busque por Sample Kits..."
      : categoria === "midi-kit"
      ? "Busque por MIDI Kits..."
      : categoria === "drum-kit"
      ? "Busque por Drum Kits..."
      : "Busque por Drum-Kits...";

  const qNorm = normalizar(pesquisa.trim());

  // aba ativa derivada da rota/categoria
  const abaAtiva: Aba =
    categoria === "drum-kit" || categoria === "sample-kit" || categoria === "midi-kit"
      ? categoria
      : "todos";

  const tabs = useMemo(
    () => [
      { key: "todos" as const, label: "Todos" },
      { key: "drum-kit" as const, label: "Drum Kit" },
      { key: "sample-kit" as const, label: "Sample Kit" },
      { key: "midi-kit" as const, label: "MIDI Kit" },
    ],
    []
  );

  const setAbaAtiva = (aba: Aba) => {
    if (aba === "todos") router.push("/drum-kit");
    else router.push(`/drum-kit/${aba}`);
  };

  return (
    <div className="relative">
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 pt-6 pb-6 md:pt-4 md:pb-10">
        {/* HERO (padrão FIFA) */}
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

            {/* Tabs + ações + busca */}
            <div className="mt-6 flex flex-col items-center gap-4">
              <PillTabs<Aba>
                name="drumkits-categoria"
                abaAtiva={abaAtiva}
                setAbaAtiva={setAbaAtiva}
                tabs={tabs}
                className="opacity-100"
              />

              {(pesquisa.trim() || categoria) && (
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
              Carregando Drum-Kits...
            </div>
          )}

          {erro && (
            <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200 backdrop-blur-md">
              {erro}
            </div>
          )}

          {!carregando && !erro && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {drumKits.length === 0 ? (
                <div className="col-span-full rounded-3xl border border-white/12 bg-black/40 p-6 text-sm text-white/70 backdrop-blur-md">
                  Nenhum Drum-Kit encontrado.
                </div>
              ) : (
                drumKits.map((k) => (
                  <CardCatalogo
                    key={k.id}
                    item={{
                      id: k.id,
                      slug: k.slug,
                      nome: k.nome,
                      subtitulo: k.subtitulo,
                      imagem_capa_url: k.imagem_capa_url,
                    }}
                    hrefBase="/drum-kit"
                    etiqueta="Drum-Kit"
                    subcategoria={k.categoria ?? categoria ?? null}
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
