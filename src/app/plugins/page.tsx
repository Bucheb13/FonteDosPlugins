import type { Metadata } from "next";
import PluginsClient from "./PluginsClient";
import { criarSupabaseServidor } from "@/lib/supabase-servidor";
import TopBaixadosSemanaPlugins from "@/components/Plugins/TopBaixadosSemanaPlugins";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Plugins para Produção Musical | Fonte dos Plugins",
  description: "Baixe Plugins profissionais para trap, drill, boom bap, eletrônica e mais.",
  alternates: {
    canonical: "/plugins",
  },
  openGraph: {
    title: "Plugins para Produção Musical | Fonte dos Plugins",
    description: "Baixe Plugins profissionais para trap, drill, boom bap, eletrônica e mais.",
    url: absoluteUrl("/plugins"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Plugins para Produção Musical | Fonte dos Plugins",
    description: "Baixe Plugins profissionais para trap, drill, boom bap, eletrônica e mais.",
  },
};

export default async function Page() {
  const supabase = await criarSupabaseServidor();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  // se der erro, tratamos como não logado
  const usuario = userErr ? null : user;

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

  const hrefAssinatura = usuario ? "/assinaturas" : "/login?retorno=/assinaturas";

  // ✅ BUSCA PLUGINS (para o ranking casar por id)
  const { data: plugins } = await supabase
    .from("plugins")
    .select("id, slug, nome, subtitulo, imagem_capa_url");

  const ranking = (
    <TopBaixadosSemanaPlugins
      limite={12}
      className="mt-16"
      dados={{ plugins: plugins ?? [] }}
    />
  );

  return (
    <PluginsClient
      mostrarAssinatura={!assinaturaAtiva}
      hrefAssinatura={hrefAssinatura}
      titulo="Plugins"
      subtituloHeader="Plugins profissionais organizados, verificados e prontos para elevar sua produção."
      ranking={ranking}
    />
  );
}
