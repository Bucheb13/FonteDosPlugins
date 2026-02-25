import { NextResponse } from "next/server";
import { autorizarAdminOuErro } from "@/lib/admin-auth";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

type TipoInstalacao = "video" | "texto" | null;

type ProgramaRow = {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string | null;
  imagem_capa_url: string | null;
  r2_chave_arquivo: string | null;
  descricao: string | null;
  tipo_instalacao: TipoInstalacao;
  conteudo_instalacao: string | null;
  ativo: boolean | null;
};

export async function GET(req: Request) {
  const negado = await autorizarAdminOuErro(req);
  if (negado) return negado;

  const slug = new URL(req.url).searchParams.get("slug")?.trim();

  if (!slug) {
    return NextResponse.json({ erro: "slug é obrigatório." }, { status: 400 });
  }

  const supabase = criarSupabaseAdmin();

  const { data, error } = await supabase
    .from("programas")
    .select(`
      id,
      slug,
      nome,
      subtitulo,
      imagem_capa_url,
      r2_chave_arquivo,
      descricao,
      tipo_instalacao,
      conteudo_instalacao,
      ativo
    `)
    .eq("slug", slug)
    .single<ProgramaRow>();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ erro: "Programa não encontrado." }, { status: 404 });
  }

  /* =========================
     NORMALIZAÇÃO DEFENSIVA
  ========================= */

  const conteudo =
    typeof data.conteudo_instalacao === "string" && data.conteudo_instalacao.trim()
      ? data.conteudo_instalacao.trim()
      : null;

  const tipo: TipoInstalacao =
    conteudo && (data.tipo_instalacao === "video" || data.tipo_instalacao === "texto")
      ? data.tipo_instalacao
      : null;

  const programaNormalizado: ProgramaRow = {
    ...data,
    subtitulo: data.subtitulo?.trim() || null,
    descricao: data.descricao?.trim() || null,
    conteudo_instalacao: conteudo,
    tipo_instalacao: tipo,
    ativo: data.ativo ?? true,
  };

  return NextResponse.json({ programa: programaNormalizado });
}
