import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProgramaClient from "./ProgramaClient";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import { absoluteUrl } from "@/lib/site-url";

type ProgramaSeo = {
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
};

async function obterPrograma(slug: string): Promise<ProgramaSeo | null> {
  const supabase = criarSupabaseAdmin();
  const { data } = await supabase
    .from("programas")
    .select("slug, nome, subtitulo, imagem_capa_url")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();

  return (data as ProgramaSeo | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const programa = await obterPrograma(slug);

  if (!programa) {
    return {
      title: "Programa não encontrado | FonteDosPlugins",
      description: "Este programa não está disponível.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${programa.nome} | Download Programa | FonteDosPlugins`;
  const description = programa.subtitulo?.trim() || `Baixe ${programa.nome} agora.`;
  const canonical = `/programas/${programa.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      type: "article",
      images: programa.imagem_capa_url ? [{ url: programa.imagem_capa_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: programa.imagem_capa_url ? [programa.imagem_capa_url] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const programa = await obterPrograma(slug);
  if (!programa) notFound();

  return <ProgramaClient slug={slug} />;
}
