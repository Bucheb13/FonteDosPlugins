import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DrumKitClient from "./DrumKitClient";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import { absoluteUrl } from "@/lib/site-url";

type DrumKitSeo = {
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
};

async function obterDrumKit(slug: string): Promise<DrumKitSeo | null> {
  const supabase = criarSupabaseAdmin();
  const { data } = await supabase
    .from("drum_kits")
    .select("slug, nome, subtitulo, imagem_capa_url")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();

  return (data as DrumKitSeo | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const drumKit = await obterDrumKit(slug);

  if (!drumKit) {
    return {
      title: "Drum-Kit não encontrado | FonteDosPlugins",
      description: "Este Drum-Kit não está disponível.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${drumKit.nome} | Download Drum-Kit | FonteDosPlugins`;
  const description = drumKit.subtitulo?.trim() || `Baixe ${drumKit.nome} agora.`;
  const canonical = `/drum-kit/${drumKit.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      type: "article",
      images: drumKit.imagem_capa_url ? [{ url: drumKit.imagem_capa_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: drumKit.imagem_capa_url ? [drumKit.imagem_capa_url] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const drumKit = await obterDrumKit(slug);
  if (!drumKit) notFound();

  return <DrumKitClient slug={slug} />;
}
