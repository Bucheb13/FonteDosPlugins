import type { Metadata } from "next";
import PluginsClient from "../PluginsClient";
import { criarSupabaseServidor } from "@/lib/supabase-servidor";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Efeitos | Fonte dos Plugins",
  description: "Plugins de efeitos para produção musical.",
  alternates: {
    canonical: "/plugins/efeitos",
  },
  openGraph: {
    title: "Efeitos | Fonte dos Plugins",
    description: "Plugins de efeitos para produção musical.",
    url: absoluteUrl("/plugins/efeitos"),
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
      categoria="efeitos"
      titulo="Efeitos"
      subtituloHeader="Plugins de efeitos (reverbs, delays, compressors e mais)."
    />
  );
}
