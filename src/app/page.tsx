import { headers } from "next/headers";
import { VitrineHome } from "@/components/home/VitrineHome";
import type { ItemVitrine } from "@/components/home/VitrineHome";
import type { Metadata } from "next";
import { criarSupabaseServidor } from "@/lib/supabase-servidor";
import BotaoGradiente from "@/components/BotaoGradiente/BotaoGradiente";
import CardGlow from "@/components/CardGlow/CardGlow";
import TopBaixadosSemanaMisto from "@/components/home/TopBaixadosSemanaMisto";
import AnimatedText from "@/components/AnimatedText/AnimatedText";
import { Badge } from "@/components/Badge/Badge";

export const metadata: Metadata = {
  title: "FonteDosPlugins — Plugins VST, DAWs e Drum Kits",
  description:
    "Baixe plugins VST, DAWs, drum kits e programas para produção musical. Grátis com espera de 15 minutos ou apoie via Pix para acesso imediato.",
};

type ItemBasico = {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
  categoria?: string | null;
};

async function obterOrigin() {
  const appUrl = process.env.APP_URL;
  if (appUrl) return appUrl.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "";
}

async function fetchLista<T>(url: string, chave: string): Promise<T[]> {
  const res = await fetch(url, { next: { revalidate: 60 } }).catch(() => null);
  if (!res || !res.ok) return [];
  const json = (await res.json()) as Record<string, unknown>;
  return (json?.[chave] as T[]) ?? [];
}

function embaralhar<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function PaginaInicial() {
  const origin = await obterOrigin();

  const [plugins, daws, drumKits, programas] = await Promise.all([
    fetchLista<ItemBasico>(`${origin}/api/plugins`, "plugins"),
    fetchLista<ItemBasico>(`${origin}/api/daws`, "daws"),
    fetchLista<ItemBasico>(`${origin}/api/drum-kit`, "drumKits"),
    fetchLista<ItemBasico>(`${origin}/api/programas`, "programas"),
  ]);

  const supabase = await criarSupabaseServidor();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  let assinaturaAtiva: { status: "ativa"; periodo_fim: string } | null = null;

  if (user) {
    const { data: assinatura } = await supabase
      .from("assinaturas")
      .select("status, periodo_fim")
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (assinatura && assinatura.status === "ativa") {
      const fim = new Date(assinatura.periodo_fim).getTime();
      const agora = new Date().getTime();
      if (fim >= agora) assinaturaAtiva = assinatura;
    }
  }

  const hrefAssinatura = user ? "/assinaturas" : "/login?retorno=/assinaturas";

  const itensHome: ItemVitrine[] = [
    ...plugins.map((i): ItemVitrine => ({
      id: i.id,
      slug: i.slug,
      nome: i.nome,
      subtitulo: i.subtitulo,
      imagem_capa_url: i.imagem_capa_url,
      categoria: "plugin",
      etiqueta: "Plugin",
      hrefBase: "/plugins",
      subcategoria: i.categoria ?? null,
    })),
    ...daws.map((i): ItemVitrine => ({
      id: i.id,
      slug: i.slug,
      nome: i.nome,
      subtitulo: i.subtitulo,
      imagem_capa_url: i.imagem_capa_url,
      categoria: "daw",
      etiqueta: "DAW",
      hrefBase: "/daws",
      subcategoria: i.categoria ?? null,
    })),
    ...drumKits.map((i): ItemVitrine => ({
      id: i.id,
      slug: i.slug,
      nome: i.nome,
      subtitulo: i.subtitulo,
      imagem_capa_url: i.imagem_capa_url,
      categoria: "drumkit",
      etiqueta: "Drum-Kit",
      hrefBase: "/drum-kit",
      subcategoria: i.categoria ?? null,
    })),
    ...programas.map((i): ItemVitrine => ({
      id: i.id,
      slug: i.slug,
      nome: i.nome,
      subtitulo: i.subtitulo,
      imagem_capa_url: i.imagem_capa_url,
      categoria: "programa",
      etiqueta: "Programa",
      hrefBase: "/programas",
      subcategoria: i.categoria ?? null,
    })),
  ];

  const itensMisturados = embaralhar(itensHome);

  const Wide = "mx-auto w-full max-w-[1600px] px-4 md:px-6";

  return (
    <div className="relative overflow-hidden">
      {/* =========================
          BACKGROUND GLOBAL (bg.gif)
          - GIF base + fade vertical (igual card)
          - glow + grid
      ========================= */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* GIF BASE */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/imagens/bg.gif')" }}
        />

        {/* FADE IGUAL AO CARD (TOP MAIS LEVE / BOTTOM MAIS ESCURO) */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/25 to-black/70" />

        {/* GLOWS */}
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/12 blur-[120px]" />
        <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-[520px] w-[520px] rounded-full bg-purple-500/10 blur-[120px]" />

        {/* GRID SUTIL */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="flex flex-col gap-10 pt-6 pb-6 md:pt-4 md:pb-10">
        {/* =========================
            HERO
        ========================= */}
        <section className={Wide}>
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04]">
  {/* Fundo do HERO */}
  <div
    className="absolute inset-0 bg-cover bg-center opacity-45"
    style={{ backgroundImage: "url('/imagens/banner-pesquisa.webp')" }}
  />

  {/* overlays corrigidos (mais escuro e premium) */}
  <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-black/80" />
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.10),rgba(0,0,0,0.55))]" />

  <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/10" />
  <div className="pointer-events-none absolute -top-28 right-[-70px] h-72 w-72 rounded-full bg-white/10 blur-3xl" />
  <div className="pointer-events-none absolute -bottom-28 left-[-70px] h-72 w-72 rounded-full bg-white/10 blur-3xl" />


  <div className="relative grid gap-6 p-6 md:grid-cols-12 md:p-8">
              {/* ESQUERDA */}
              <div className="md:col-span-7">
              <div className="inline-flex items-center gap-2">
  
  <Badge innerClassName="!py-1 !px-3"><span className="mr-2 h-2 w-2 rounded-full bg-cyan-300/80 mr-1" />Torrents Verificados</Badge>
</div>


                <h1 className="mt-4 text-3xl md:text-5xl leading-[1.08] tracking-tight">
                  A central <span className="text-white/75">mais rápida</span> para elevar sua{" "}
                  <span className="text-white/75">produção musical.</span>
                </h1>

                <p className="mt-3 text-base md:text-lg text-white/80 max-w-xl">
                  Plugins, DAWs, drum kits e ferramentas em um só lugar.
                </p>

                {/* benefícios */}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">

                {[
  {
    t: "Curadoria",
    s: "Conteúdo de Qualidade",
    d: "Plugins selecionados e organizados para você encontrar tudo rápido.",
  },
  {
    t: "Velocidade",
    s: "Download Imediato",
    d: "Apoie o projeto e libere o acesso sem filas ou espera.",
  },
  {
    t: "Segurança",
    s: "Links Confiáveis",
    d: "Arquivos verificados, estáveis e sempre disponíveis.",
  },
].map((b) => (
  <CardGlow
    key={b.t}
    badgeWords={[b.t, b.s]}
    className="
      min-h-[46px]
      sm:min-h-[54px]
      md:min-h-[60px]
    "
  >
    <div className="mt-2 text-center">
      {/* descrição */}
      <p className="mt-1 text-xs text-white/70">
        {b.d}
      </p>
    </div>
  </CardGlow>
))}

</div>

                
                  {assinaturaAtiva ? (
                    <span className="text-sm text-green-400">
                    </span>
                  ) : (
                    <BotaoGradiente href={hrefAssinatura}  className="
                    group relative mt-8 inline-flex items-center gap-2
                    overflow-hidden rounded-full">
                    Apoiar via Pix e baixar sem espera
                  </BotaoGradiente>

                  )}
                  {/* CTA */}
                <div className="mt-6 flex flex-col items-start gap-3">
                  <span className="text-xs text-white/65">
                    Download grátis com espera de 15 minutos • Apoie por um valor <strong>simbólico</strong> de: <AnimatedText/>
                  </span>
                </div>
              </div>

              {/* DIREITA (seu bloco atual) */}
              <div className="hidden md:block md:col-span-5">
                <div className="h-full rounded-[28px] border border-white/12 bg-black/35 p-6 backdrop-blur">
                  <div className="inline-flex items-center gap-2 rounded-full">
  <Badge innerClassName="!py-1 !px-3"><span className="mr-2 h-2 w-2 rounded-full bg-green-300/80 mr-1" />A Verdadeira Alquimia Das Ruas</Badge>
                  </div>
                  

                  <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">
                    Entre na fila e baixe grátis ou{" "}
                    <span className="text-cyan-300">apoie e libere na hora</span>.
                  </h3>

                  <ol className="mt-5 space-y-3 text-sm text-white/80">
                    <li className="flex gap-3">
                      <span className="mt-0.5 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-xs text-cyan-300">
                        1
                      </span>
                      <span>Encontre o plugin/DAW/drum kit no catálogo</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-xs text-cyan-300">
                        2
                      </span>
                      <span>Baixe grátis com espera (15 min)</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-xs text-cyan-300">
                        3
                      </span>
                      <span>Apoie via Pix e baixe sem espera (imediato)</span>
                    </li>
                  </ol>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <CardGlow
  badgeWords={["Grátis", "Acesso com espera"]}
  badgeColors={["#ffffff", "#9ca3af"]}
  className="
    min-h-[88px]
    sm:min-h-[96px]
    md:min-h-[104px]
  "
>
  <ul className="mt-2 space-y-1 text-xs text-white/70">
    <li>• Download liberado após 15 minutos</li>
    <li>• Ideal para testar antes de apoiar</li>
  </ul>
</CardGlow>




<CardGlow
  badgeWords={["Apoio via Pix", "Acesso imediato"]}
  badgeColors={["#67e8f9", "#22d3ee"]}
  className="
    min-h-[88px]
    sm:min-h-[96px]
    md:min-h-[104px]
  "
>
  <ul className="mt-2 space-y-1 text-xs text-cyan-100/70">
    <li>• Download liberado na hora</li>
    <li>• Mantém o projeto vivo</li>
  </ul>
</CardGlow>


</div>

                  <div className="mt-5 flex flex-col gap-3">
                    {!assinaturaAtiva ? (
                                <BotaoGradiente href={hrefAssinatura}>
                                Liberar acesso imediato
                              </BotaoGradiente>
                    ) : (
                      <div className="rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">
                        Assinatura ativa até: ✅<strong>
                        {new Date(assinaturaAtiva.periodo_fim).toLocaleDateString("pt-BR")}
                      </strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        <section className={Wide}>
  <TopBaixadosSemanaMisto
    limite={12}
    dados={{ plugins, daws, drumKits, programas }}
  />
</section>


        {/* =========================
           VITRINE
        ========================= */}
        <section id="catalogo" className={`${Wide} [scroll-margin-top:calc(var(--topbar-h)+var(--anchor-gap))]`}>
          <VitrineHome
            itens={itensMisturados}
            contagens={{
              plugins: plugins.length,
              daws: daws.length,
              drumKits: drumKits.length,
              programas: programas.length,
            }}
          />
        </section>

        
      </div>
    </div>
  );
}
