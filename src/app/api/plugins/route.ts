import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type TipoInstalacao = "video" | "texto";
type Categoria = "efeitos" | "instrumentais";

type PluginsPublico = {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
  descricao: string | null;
  tipo_instalacao: TipoInstalacao;
  conteudo_instalacao: string | null;
  ativo: boolean;
  categoria: Categoria | null; // ✅ agora vem
};

export async function GET(req: Request) {
  const supabase = criarSupabaseAdmin();
  const url = new URL(req.url);

  const slug = url.searchParams.get("slug");
  const q = url.searchParams.get("q");
  const categoria = url.searchParams.get("categoria"); // "efeitos" | "instrumentais"

  const selectCols =
    "id, slug, nome, subtitulo, imagem_capa_url, descricao, tipo_instalacao, conteudo_instalacao, ativo, categoria";

  // ✅ CASO 1: obter 1 item por slug
  if (slug) {
    const { data, error } = await supabase
      .from("plugins")
      .select(selectCols)
      .eq("slug", slug)
      .eq("ativo", true)
      .maybeSingle();

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ erro: "Plugin não encontrado." }, { status: 404 });

    return NextResponse.json({ plugin: data as PluginsPublico });
  }

  // ✅ CASO 2: listar todos ou filtrar por pesquisa/categoria
  let query = supabase
    .from("plugins")
    .select(selectCols)
    .eq("ativo", true)
    .order("criado_em", { ascending: false });

  // ✅ filtro categoria (se veio)
  if (categoria) {
    query = query.eq("categoria", categoria);
  }

  // ✅ pesquisa em nome e subtitulo
  if (q && q.length > 0) {
    query = query.or(`nome.ilike.%${q}%,subtitulo.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ plugins: (data ?? []) as PluginsPublico[] });
}
