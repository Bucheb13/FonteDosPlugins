import type { Metadata } from "next";
import DrumKitsClient from "./DrumKitsClient";
import { criarSupabaseServidor } from "@/lib/supabase-servidor";
import TopSemanaDrumKit from "@/components/DrumKits/TopBaixadosSemanaDrumKits";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Drum-Kits para Produção Musical | Fonte dos Plugins",
  description:
    "Baixe Drum-Kits profissionais para trap, drill, boom bap, eletrônica e mais.",
  alternates: {
    canonical: "/drum-kit",
  },
  openGraph: {
    title: "Drum-Kits para Produção Musical | Fonte dos Plugins",
    description: "Baixe Drum-Kits profissionais para trap, drill, boom bap, eletrônica e mais.",
    url: absoluteUrl("/drum-kit"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Drum-Kits para Produção Musical | Fonte dos Plugins",
    description: "Baixe Drum-Kits profissionais para trap, drill, boom bap, eletrônica e mais.",
  },
};

export default async function Page() {
  const supabase = await criarSupabaseServidor();

  // ✅ forma segura (remove warning do Supabase)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  const usuario = userErr ? null : user;

  // ✅ verifica assinatura ativa
  let assinaturaAtiva = false;

  if (usuario) {
    const { data: assinatura } = await supabase
      .from("assinaturas")
      .select("status, periodo_fim")
      .eq("usuario_id", usuario.id)
      .maybeSingle();

    if (assinatura?.status === "ativa") {
      const fimMs = Date.parse(String(assinatura.periodo_fim));
      const agoraMs = new Date().getTime();
      if (!Number.isNaN(fimMs)) assinaturaAtiva = fimMs >= agoraMs;
    }
  }

  // ✅ CTA coerente com Plugins
  const hrefAssinatura = usuario
    ? "/assinaturas"
    : "/login?retorno=/assinaturas";

  // ✅ BUSCA DRUM-KITS (para o ranking casar por id)
  // ⚠️ troque "drum_kits" pelo nome real da sua tabela se for diferente
  const { data: drumKits } = await supabase
    .from("drum_kits")
    .select("id, slug, nome, subtitulo, imagem_capa_url");

  const ranking = (
    <TopSemanaDrumKit
      limite={12}
      className="mt-16"
      dados={{ drumKits: drumKits ?? [] }}
    />
  );

  return (
    <DrumKitsClient
      mostrarAssinatura={!assinaturaAtiva}
      hrefAssinatura={hrefAssinatura}
      titulo="Drum-Kits"
      subtituloHeader="Drum-kits profissionais organizados, verificados e prontos para elevar sua produção."
      ranking={ranking}
    />
  );
}
