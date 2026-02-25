import type { Metadata } from "next";
import DawsClient from "./DawsClient";
import { criarSupabaseServidor } from "@/lib/supabase-servidor";
import TopSemanaDaws from "@/components/Daws/TopBaixadosSemanaDaws";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "DAWs para Produção Musical | Fonte dos Plugins",
  description:
    "Baixe DAWs profissionais como FL Studio, Ableton Live, Reaper e outras para produção musical.",
  alternates: {
    canonical: "/daws",
  },
  openGraph: {
    title: "DAWs para Produção Musical | Fonte dos Plugins",
    description: "Baixe DAWs profissionais como FL Studio, Ableton Live, Reaper e outras para produção musical.",
    url: absoluteUrl("/daws"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DAWs para Produção Musical | Fonte dos Plugins",
    description: "Baixe DAWs profissionais como FL Studio, Ableton Live, Reaper e outras para produção musical.",
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

  const { data: daws } = await supabase
    .from("daws")
    .select("id, slug, nome, subtitulo, imagem_capa_url");

  const ranking = (
    <TopSemanaDaws
      limite={12}
      className="mt-16"
      dados={{ daws: daws ?? [] }}
    />
  );

  return (
    <DawsClient
      mostrarAssinatura={!assinaturaAtiva}
      hrefAssinatura={hrefAssinatura}
      titulo="DAWs"
      subtituloHeader="DAWs profissionais organizadas, verificadas e prontas para elevar sua produção."
      ranking={ranking}
    />
  );
}
