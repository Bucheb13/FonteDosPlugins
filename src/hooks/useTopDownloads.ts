"use client";

import { useEffect, useMemo, useState } from "react";
import { criarSupabaseNavegador } from "@/lib/supabase-navegador";

export type ItemTipo = "plugin" | "daw" | "drum-kit" | "programa";

type DownloadAggRow = {
  item_id: string;
  downloads: number | string;
};

type ItemMini = {
    id: string;
    slug: string;
    nome: string;
    imagem_capa_url: string | null;
  };
  
  export type TopItem = ItemMini & {
    downloads: number;
  };
  

// ✅ type guard: garante que algo é array
function isArray<T>(v: unknown): v is T[] {
  return Array.isArray(v);
}

export function useTopDownloads(tipo: ItemTipo, limit = 5) {
  const supabase = useMemo(() => criarSupabaseNavegador(), []);
  const [data, setData] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        // ⚠️ não usamos .returns<...>() aqui pra não gerar union estranho no TS
        const { data: agg, error } = await supabase.rpc("top_downloads", {
          p_tipo: tipo,
          p_limit: limit,
        });

        if (error) {
          console.error("[useTopDownloads] rpc error:", error);
          if (alive) setData([]);
          return;
        }

        // ✅ se não for array, aborta com segurança
        if (!isArray<DownloadAggRow>(agg)) {
          console.warn("[useTopDownloads] rpc retornou formato inesperado:", agg);
          if (alive) setData([]);
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
          if (alive) setData([]);
          return;
        }

        const tabelaPorTipo: Record<ItemTipo, string> = {
          plugin: "plugins",
          daw: "daws",
          "drum-kit": "drum_kits",
          programa: "programas",
        };

        const tabela = tabelaPorTipo[tipo];

        const { data: itens, error: err2 } = await supabase
          .from(tabela)
          .select("id, slug, nome, imagem_capa_url")
          .in("id", ids);

        if (err2) {
          console.error("[useTopDownloads] itens error:", err2);
          if (alive) setData([]);
          return;
        }

        if (!isArray<ItemMini>(itens)) {
          console.warn("[useTopDownloads] itens retornou formato inesperado:", itens);
          if (alive) setData([]);
          return;
        }

        const byId = new Map<string, ItemMini>(
          itens.map((i: ItemMini) => [String(i.id), i])
        );

        const final: TopItem[] = rows
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
          .filter((x: TopItem | null): x is TopItem => x !== null); // ✅ sem implicit any

        if (alive) setData(final);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabase, tipo, limit]);

  return { data, loading };
}
