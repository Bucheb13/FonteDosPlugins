"use client";

import { useMemo, useState } from "react";
import { CardCatalogo } from "@/components/CardCatalogo";
import { SearchGlow } from "@/components/SearchGlow/SearchGlow";
import PillTabs from "@/components/PillTabs/PillTabs";
import BotaoPolice from "@/components/BotaoPolice/BotaoPolice";


type Categoria = "todos" | "plugin" | "daw" | "drumkit" | "programa";
type Ordem = "recentes" | "az";

export type ItemVitrine = {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
  categoria: Exclude<Categoria, "todos">;
  etiqueta: string;
  hrefBase: string;
  subcategoria?: string | null;
};

function normalizar(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function VitrineHome({
  itens,
}: {
  itens: ItemVitrine[];
  contagens: {
    plugins: number;
    daws: number;
    drumKits: number;
    programas: number;
  };
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("todos");
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [limit, setLimit] = useState(8);

  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim());
    let base = itens;

    if (categoria !== "todos") base = base.filter((i) => i.categoria === categoria);

    if (q) {
      base = base.filter((i) => {
        const alvo = normalizar(`${i.nome} ${i.slug} ${i.subtitulo ?? ""}`);
        return alvo.includes(q);
      });
    }

    if (ordem === "az") {
      base = [...base].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }

    return base;
  }, [itens, busca, categoria, ordem]);

  const visiveis = filtrados.slice(0, limit);
  const podeCarregarMais = visiveis.length < filtrados.length;

  return (
    <section className="relative overflow-visble rounded-[32px] px-6 py-10 md:px-10 md:py-14 border border-white/12 bg-black/35 backdrop-blur-md">
     <div className="absolute inset-0 overflow-hidden rounded-[32px]">
    <div
      className="absolute inset-0 z-0 bg-cover bg-center opacity-55"
      style={{ backgroundImage: "url('/imagens/banner-destaque.webp')" }}
    />
    <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-black/25 via-black/75 to-black/90" />
    <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.10] noise-overlay" />
    <div className="pointer-events-none absolute inset-0 z-0 rounded-[32px] ring-1 ring-inset ring-white/10" />
  </div>

      {/* ✅ CABEÇALHO CENTRALIZADO */}
      <div className="relative z-10 flex flex-col items-center text-center gap-4">
        <div>
          <h2 className="text-shadow-strong text-3xl font-extrabold tracking-tight md:text-4xl">
            Tudo que você precisa para{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-white/90 to-fuchsia-300 bg-clip-text text-transparent">
              produzir músicas com qualidade
            </span>
            !
          </h2>

          <p className="text-shadow-soft mt-2 max-w-2xl mx-auto text-sm leading-relaxed text-white/80">
            Plugins, DAWs e ferramentas premium em um só lugar.
          </p>
        </div>

        {/* BUSCA CENTRALIZADA */}
        <div className="w-full max-w-[720px] mt-2">
  <SearchGlow value={busca} onChange={setBusca} placeholder="Pesquise..." />
</div>

      </div>

{/* ✅ TABS CENTRALIZADOS (PillTabs) */}
<div className="relative z-10 mt-6 flex flex-col items-center gap-3 overflow-visible">
  <PillTabs<Categoria>
    name="vitrine-categorias"
    abaAtiva={categoria}
    setAbaAtiva={(v) => {
      setCategoria(v);
      setLimit(8); // opcional: resetar paginação ao trocar categoria
    }}
    tabs={[
      { key: "todos", label: "Todos" },
      { key: "plugin", label: "Plugins" },
      { key: "daw", label: "DAWs" },
      { key: "drumkit", label: "Drum Kits" },
      { key: "programa", label: "Programas" },
    ]}
    className="opacity-100"
  />

  {(busca.trim() || categoria !== "todos") && (
    <BotaoPolice
  onClick={() => {
    setBusca("");
    setCategoria("todos");
    setOrdem("recentes");
    setLimit(8);
  }}
>
  Limpar filtros
</BotaoPolice>

  )}
</div>


      {/* RESULTADOS */}
      <div className="relative z-10 mt-6">
        {visiveis.length === 0 ? (
          <div className="rounded-3xl border border-white/12 bg-black/40 p-6 text-sm text-white/75 backdrop-blur-md text-center">
            Nada foi encontrado para sua pesquisa.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in zoom-in-95 duration-500">
              {visiveis.map((item) => (
                <CardCatalogo
                  key={`${item.categoria}-${item.id}`}
                  item={item}
                  hrefBase={item.hrefBase}
                  etiqueta={item.etiqueta}
                  subcategoria={item.subcategoria}
                />
              ))}
            </div>

            {podeCarregarMais && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setLimit((prev) => prev + 8)}
                  className="rounded-2xl border border-white/25 bg-black/45 px-6 py-3 text-sm font-semibold text-white/90 backdrop-blur-md hover:bg-black/60 hover:border-white/35 transition"
                >
                  Carregar mais
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
