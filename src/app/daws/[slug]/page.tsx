import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DawClient from "./DawClient";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import { absoluteUrl } from "@/lib/site-url";

type DawSeo = {
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
};

async function obterDaw(slug: string): Promise<DawSeo | null> {
  const supabase = criarSupabaseAdmin();
  const { data } = await supabase
    .from("daws")
    .select("slug, nome, subtitulo, imagem_capa_url")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();

  return (data as DawSeo | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const daw = await obterDaw(slug);

  if (!daw) {
    return {
      title: "DAW não encontrada | FonteDosPlugins",
      description: "Esta DAW não está disponível.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${daw.nome} | Download DAW | FonteDosPlugins`;
  const description = daw.subtitulo?.trim() || `Baixe ${daw.nome} agora.`;
  const canonical = `/daws/${daw.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      type: "article",
      images: daw.imagem_capa_url ? [{ url: daw.imagem_capa_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: daw.imagem_capa_url ? [daw.imagem_capa_url] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const daw = await obterDaw(slug);
  if (!daw) notFound();

  return <DawClient slug={slug} />;
}
