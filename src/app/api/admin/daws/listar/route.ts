import { NextResponse } from "next/server";
import { autorizarAdminOuErro } from "@/lib/admin-auth";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const negado = await autorizarAdminOuErro(req);
  if (negado) return negado;

  const supabase = criarSupabaseAdmin();

  const { data, error } = await supabase
    .from("daws")
    .select(
      `
      id,
      slug,
      nome,
      subtitulo,
      imagem_capa_url,
      r2_chave_arquivo,
      descricao,
      tipo_instalacao,
      conteudo_instalacao,
      ativo,
      criado_em
    `
    )
    .order("criado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ itens: data ?? [] });
}
