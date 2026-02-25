import type { Metadata } from "next";
import ProgramasClient from "./ProgramasClient";
import { criarSupabaseServidor } from "@/lib/supabase-servidor";
import TopSemanaProgramas from "@/components/Programas/TopBaixadosSemanaProgramas";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Programas para Produção Musical | Fonte dos Plugins",
  description:
    "Baixe Programas profissionais para trap, drill, boom bap, eletrônica e mais.",
  alternates: {
    canonical: "/programas",
  },
  openGraph: {
    title: "Programas para Produção Musical | Fonte dos Plugins",
    description: "Baixe Programas profissionais para trap, drill, boom bap, eletrônica e mais.",
    url: absoluteUrl("/programas"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Programas para Produção Musical | Fonte dos Plugins",
    description: "Baixe Programas profissionais para trap, drill, boom bap, eletrônica e mais.",
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


  const hrefAssinatura = usuario
    ? "/assinaturas"
    : "/login?retorno=/assinaturas";

  const { data: programas } = await supabase
    .from("programas")
    .select("id, slug, nome, subtitulo, imagem_capa_url");

  const ranking = (
    <TopSemanaProgramas
      limite={12}
      className="mt-16"
      dados={{ programas: programas ?? [] }}
    />
  );

  return (
    <ProgramasClient
      mostrarAssinatura={!assinaturaAtiva}
      hrefAssinatura={hrefAssinatura}
      titulo="Programas"
      subtituloHeader="Programas profissionais organizados, verificados e prontos para elevar sua produção."
      ranking={ranking}
    />
  );
}
