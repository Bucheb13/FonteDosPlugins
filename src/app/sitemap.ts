import type { MetadataRoute } from "next";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

type ItemSitemapDb = {
  slug: string;
  ativo?: boolean | null;
  imagem_capa_url?: string | null;
  updated_at?: string | null;
  criado_em?: string | null;
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.fontedosplugins.com.br").replace(/\/+$/, "");

function toDate(v?: string | null) {
  if (!v) return new Date();
  const t = new Date(v);
  return Number.isNaN(t.getTime()) ? new Date() : t;
}

function fixas(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, priority: 1.0 },
    { url: `${SITE_URL}/plugins`, lastModified: now, priority: 0.9 },
    { url: `${SITE_URL}/plugins/efeitos`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/plugins/instrumentais`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/daws`, lastModified: now, priority: 0.9 },
    { url: `${SITE_URL}/drum-kit`, lastModified: now, priority: 0.9 },
    { url: `${SITE_URL}/drum-kit/drum-kit`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/drum-kit/sample-kit`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/drum-kit/midi-kit`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/programas`, lastModified: now, priority: 0.85 },
    { url: `${SITE_URL}/assinaturas`, lastModified: now, priority: 0.7 },
    { url: `${SITE_URL}/contato`, lastModified: now, priority: 0.6 },
    { url: `${SITE_URL}/termos-de-uso`, lastModified: now, priority: 0.3 },
    { url: `${SITE_URL}/privacidade`, lastModified: now, priority: 0.3 },
  ];
}

function mapear(itens: ItemSitemapDb[], basePath: string, priority: number): MetadataRoute.Sitemap {
  return itens
    .filter((i) => Boolean(i.slug) && i.ativo !== false)
    .map((i) => ({
      url: `${SITE_URL}/${basePath}/${encodeURIComponent(i.slug)}`,
      lastModified: toDate(i.updated_at ?? i.criado_em),
      priority,
      images: i.imagem_capa_url ? [i.imagem_capa_url] : undefined,
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = criarSupabaseAdmin();

  const [pluginsRes, dawsRes, drumKitsRes, programasRes] = await Promise.all([
    supabase.from("plugins").select("slug, ativo, imagem_capa_url, updated_at, criado_em").eq("ativo", true),
    supabase.from("daws").select("slug, ativo, imagem_capa_url, updated_at, criado_em").eq("ativo", true),
    supabase.from("drum_kits").select("slug, ativo, imagem_capa_url, updated_at, criado_em").eq("ativo", true),
    supabase.from("programas").select("slug, ativo, imagem_capa_url, updated_at, criado_em").eq("ativo", true),
  ]);

  const plugins = (pluginsRes.data ?? []) as ItemSitemapDb[];
  const daws = (dawsRes.data ?? []) as ItemSitemapDb[];
  const drumKits = (drumKitsRes.data ?? []) as ItemSitemapDb[];
  const programas = (programasRes.data ?? []) as ItemSitemapDb[];

  return [
    ...fixas(),
    ...mapear(plugins, "plugins", 0.85),
    ...mapear(daws, "daws", 0.85),
    ...mapear(drumKits, "drum-kit", 0.8),
    ...mapear(programas, "programas", 0.8),
  ];
}
