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

type Tipo = "plugin" | "daw" | "drum-kit" | "programa";

type Props = {
  limite?: number;
  className?: string;
  /** ✅ se informado, filtra somente este tipo */
  somenteTipo?: Tipo;
  dados: {
    plugins: ItemBasico[];
    daws: ItemBasico[];
    drumKits: ItemBasico[];
    programas: ItemBasico[];
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
  tipo: Tipo;
};

const hrefPorTipo: Record<Tipo, string> = {
  plugin: "/plugins",
  daw: "/daws",
  "drum-kit": "/drum-kit",
  programa: "/programas",
};

export default async function TopBaixadosSemanaMisto({
  limite = 12,
  className = "",
  dados,
  somenteTipo,
}: Props) {
  const supabase = await criarSupabaseServidor();

  const { data, error } = await supabase.rpc("top_downloads_misto_semana", {
    p_limite: limite,
  });

  if (error || !data?.length) return null;

  // ✅ filtra por tipo, se quiser
  const rows = (data as RowTop[]).filter((r) =>
    somenteTipo ? (r.item_tipo as Tipo) === somenteTipo : true
  );

  if (!rows.length) return null;

  // maps por tipo -> item_id
  const mPlugins = new Map(dados.plugins.map((i) => [i.id, i]));
  const mDaws = new Map(dados.daws.map((i) => [i.id, i]));
  const mDrum = new Map(dados.drumKits.map((i) => [i.id, i]));
  const mProg = new Map(dados.programas.map((i) => [i.id, i]));

  const cards: CardData[] = rows
    .map<CardData | null>((r, index) => {
      const tipo = r.item_tipo as Tipo;

      let item: ItemBasico | undefined;
      if (tipo === "plugin") item = mPlugins.get(r.item_id);
      else if (tipo === "daw") item = mDaws.get(r.item_id);
      else if (tipo === "drum-kit") item = mDrum.get(r.item_id);
      else if (tipo === "programa") item = mProg.get(r.item_id);
      else return null;

      if (!item) return null;

      return {
        item,
        hrefBase: hrefPorTipo[tipo],
        etiqueta: `#${index + 1}`,
        tipo,
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

                <div className="flex justify-center w-full">
                <PureCss3D
  text="Os Mais Baixados"
  className="
    -translate-x-10 scale-[0.64]
    sm:-translate-x-2 sm:scale-[0.40]
    md:-translate-x-58 md:scale-[0.48]
  "
/>
</div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {cards.map((c) => (
                <CardCatalogo
                  key={`${c.tipo}-${c.item.id}`}
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
