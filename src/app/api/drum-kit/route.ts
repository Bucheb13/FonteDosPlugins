import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type TipoInstalacao = "video" | "texto";
type CategoriaDrumKit = "drum-kit" | "sample-kit" | "midi-kit";

type DrumKitsPublico = {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
  descricao: string | null;
  tipo_instalacao: TipoInstalacao;
  conteudo_instalacao: string | null;
  ativo: boolean;

  // ✅ NOVO
  categoria: CategoriaDrumKit | null;
};

function validarCategoria(v: string | null): CategoriaDrumKit | null {
  if (!v) return null;
  const x = v.trim().toLowerCase();
  if (x === "drum-kit" || x === "sample-kit" || x === "midi-kit") return x;
  return null;
}

export async function GET(req: Request) {
  const supabase = criarSupabaseAdmin();
  const url = new URL(req.url);

  const slug = url.searchParams.get("slug");
  const q = url.searchParams.get("q");
  const categoria = validarCategoria(url.searchParams.get("categoria"));

  const selectCols =
    "id, slug, nome, subtitulo, imagem_capa_url, descricao, tipo_instalacao, conteudo_instalacao, ativo, categoria";

  // ✅ CASO 1: obter 1 drum kit por slug
  if (slug) {
    const { data, error } = await supabase
      .from("drum_kits")
      .select(selectCols)
      .eq("slug", slug)
      .eq("ativo", true)
      .maybeSingle();

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ erro: "Drum-Kit não encontrado." }, { status: 404 });

    return NextResponse.json({ drumKit: data as DrumKitsPublico });
  }

  // ✅ CASO 2: listar todos ou filtrar por pesquisa/categoria
  let query = supabase
    .from("drum_kits")
    .select(selectCols)
    .eq("ativo", true)
    .order("criado_em", { ascending: false });

  // ✅ filtro por categoria
  if (categoria) {
    query = query.eq("categoria", categoria);
  }

  // ✅ pesquisa em nome e subtitulo
  if (q && q.length > 0) {
    query = query.or(`nome.ilike.%${q}%,subtitulo.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ drumKits: (data ?? []) as DrumKitsPublico[] });
}
