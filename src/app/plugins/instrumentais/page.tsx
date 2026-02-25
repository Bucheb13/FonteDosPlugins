import type { Metadata } from "next";
import PluginsClient from "../PluginsClient";
import { criarSupabaseServidor } from "@/lib/supabase-servidor";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Instrumentais | Fonte dos Plugins",
  description: "Instrumentais e livrarias para produção musical.",
  alternates: {
    canonical: "/plugins/instrumentais",
  },
  openGraph: {
    title: "Instrumentais | Fonte dos Plugins",
    description: "Instrumentais e livrarias para produção musical.",
    url: absoluteUrl("/plugins/instrumentais"),
    type: "website",
  },
};

export default async function Page() {
  const supabase = await criarSupabaseServidor();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  // ✅ verifica assinatura ativa
  let assinaturaAtiva = false;

  if (user) {
    const { data: assinatura } = await supabase
      .from("assinaturas")
      .select("status, periodo_fim")
      .eq("usuario_id", user.id)
      .maybeSingle();
  
    if (assinatura?.status === "ativa") {
      const fimMs = Date.parse(String(assinatura.periodo_fim));
      const agoraMs = new Date().getTime();
  
      if (!Number.isNaN(fimMs)) {
        assinaturaAtiva = fimMs >= agoraMs;
      }
    }
  }
  

  // ✅ define para onde levar o usuário
  const hrefAssinatura = user ? "/assinaturas" : "/login?retorno=/assinaturas";

  return (
    <PluginsClient
    mostrarAssinatura={!assinaturaAtiva}
    hrefAssinatura={hrefAssinatura}
      categoria="instrumentais"
      titulo="Instrumentais"
      subtituloHeader="Instrumentais e livrarias (trap, drill, boom bap e mais)."
    />
  );
}
