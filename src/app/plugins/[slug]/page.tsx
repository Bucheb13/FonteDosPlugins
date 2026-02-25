import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PluginClient from "./PluginClient";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import { absoluteUrl } from "@/lib/site-url";

type PluginSeo = {
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
};

async function obterPlugin(slug: string): Promise<PluginSeo | null> {
  const supabase = criarSupabaseAdmin();
  const { data } = await supabase
    .from("plugins")
    .select("slug, nome, subtitulo, imagem_capa_url")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();

  return (data as PluginSeo | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const plugin = await obterPlugin(slug);

  if (!plugin) {
    return {
      title: "Plugin não encontrado | FonteDosPlugins",
      description: "Este plugin não está disponível.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${plugin.nome} | Download Plugin | FonteDosPlugins`;
  const description = plugin.subtitulo?.trim() || `Baixe ${plugin.nome} agora.`;
  const canonical = `/plugins/${plugin.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      type: "article",
      images: plugin.imagem_capa_url ? [{ url: plugin.imagem_capa_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: plugin.imagem_capa_url ? [plugin.imagem_capa_url] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plugin = await obterPlugin(slug);
  if (!plugin) notFound();

  return <PluginClient slug={slug} />;
}
