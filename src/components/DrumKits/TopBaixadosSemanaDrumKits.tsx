import { criarSupabaseServidor } from "@/lib/supabase-servidor";
import { CardCatalogo } from "@/components/CardCatalogo";
import { Badge } from "../Badge/Badge";
import PureCss3D from "../PureCss3D/PureCss3D";

type ItemBasico = {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
};

type Props = {
  limite?: number;
  className?: string;
  dados: {
    drumKits: ItemBasico[];
  };
};

type RowTop = {
  item_tipo: string;
  item_id: string;
  downloads_semana: string | number | null;
  downloads_total: string | number | null;
};

type CardData = {
  item: ItemBasico;
  hrefBase: string;
  etiqueta: string;
  tipo: "drum-kit";
};

export default async function TopBaixadosSemanaDrumKits({
  limite = 12,
  className = "",
  dados,
}: Props) {
  const supabase = await criarSupabaseServidor();

  const { data, error } = await supabase.rpc("top_downloads_misto_semana", {
    p_limite: limite,
  });

  if (error || !data?.length) return null;

  // ✅ somente drum-kit
  const rows = (data as RowTop[]).filter((r) => r.item_tipo === "drum-kit");
  if (!rows.length) return null;

  const mDrumKits = new Map(dados.drumKits.map((i) => [i.id, i]));

  const cards: CardData[] = rows
    .map<CardData | null>((r, index) => {
      const item = mDrumKits.get(r.item_id);
      if (!item) return null;

      return {
        item,
        hrefBase: "/drum-kit",
        etiqueta: `#${index + 1}`,
        tipo: "drum-kit",
      };
    })
    .filter((x): x is CardData => x !== null);

  if (!cards.length) return null;

  return (
    <section className={className}>
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/35">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/[0.23] via-transparent to-black/40" />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-500/12 blur-[120px]" />
          <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/10" />

          <div className="relative p-6 md:p-8">
            <div className="mb-6 flex justify-center">
              <div className="flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2">
                  <Badge innerClassName="!py-1 !px-3">
                    <span className="mr-2 h-2 w-2 rounded-full bg-fuchsia-300/70" />
                    Ranking Semanal
                  </Badge>
                </div>

                <div className="flex">
                  <PureCss3D
                    text={"Drum-Kits Mais Baixados"}
                    className="
-translate-x-20 scale-[0.50]
sm:-translate-x-2 sm:scale-[0.40]
md:-translate-x-85 md:scale-[0.48]
  "
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {cards.map((c) => (
                <CardCatalogo
                  key={`drum-kit-${c.item.id}`}
                  item={c.item}
                  hrefBase={c.hrefBase}
                  etiqueta={c.etiqueta}
                  subcategoria={c.tipo}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
