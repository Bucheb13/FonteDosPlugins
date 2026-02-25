import { NextResponse } from "next/server";
import { autorizarAdminOuErro } from "@/lib/admin-auth";
import { registrarAuditoriaAdmin } from "@/lib/admin-auditoria";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

type TipoInstalacao = "video" | "texto" | null;

type Body = {
  slug: string;
  nome?: string;
  subtitulo?: string | null;
  descricao?: string | null;
  tipo_instalacao?: TipoInstalacao;
  conteudo_instalacao?: string | null;
  ativo?: boolean;
};

type Patch = Partial<Omit<Body, "slug">>;

function parseTipoInstalacao(v: unknown): { ok: true; value: TipoInstalacao } | { ok: false } {
  if (v === null || typeof v === "undefined") return { ok: true, value: null };
  if (v === "video" || v === "texto") return { ok: true, value: v };
  if (typeof v === "string" && v.trim() === "") return { ok: true, value: null };
  return { ok: false };
}

export async function POST(req: Request) {
  const negado = await autorizarAdminOuErro(req);
  if (negado) return negado;

  await registrarAuditoriaAdmin(req, { acao: "POST", entidade: "daws/editar" });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "Body inválido." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ erro: "Body inválido." }, { status: 400 });
  }

  const b = body as Body;

  const slug = typeof b.slug === "string" ? b.slug.trim() : "";
  if (!slug) {
    return NextResponse.json({ erro: "slug é obrigatório." }, { status: 400 });
  }

  const patch: Patch = {};

  if (typeof b.nome === "string") patch.nome = b.nome.trim();

  if (typeof b.subtitulo === "string") patch.subtitulo = b.subtitulo.trim() || null;
  else if (b.subtitulo === null) patch.subtitulo = null;

  if (typeof b.descricao === "string") patch.descricao = b.descricao.trim() || null;
  else if (b.descricao === null) patch.descricao = null;

  // ✅ tipo_instalacao (aceita null)
  if (typeof b.tipo_instalacao !== "undefined") {
    const tipoParsed = parseTipoInstalacao(b.tipo_instalacao);
    if (!tipoParsed.ok) {
      return NextResponse.json(
        { erro: "tipo_instalacao inválido (use: video | texto | null)." },
        { status: 400 }
      );
    }
    patch.tipo_instalacao = tipoParsed.value;
  }

  // ✅ conteudo_instalacao (aceita null)
  if (typeof b.conteudo_instalacao !== "undefined") {
    if (b.conteudo_instalacao === null) {
      patch.conteudo_instalacao = null;
    } else if (typeof b.conteudo_instalacao === "string") {
      patch.conteudo_instalacao = b.conteudo_instalacao.trim() || null;
    } else {
      return NextResponse.json(
        { erro: "conteudo_instalacao inválido (string | null)." },
        { status: 400 }
      );
    }
  }

  if (typeof b.ativo === "boolean") patch.ativo = b.ativo;

  // ===============================
  // COERÊNCIA ENTRE TIPO E CONTEÚDO
  // ===============================
  const tipoNoPatch = Object.prototype.hasOwnProperty.call(patch, "tipo_instalacao");
  const conteudoNoPatch = Object.prototype.hasOwnProperty.call(patch, "conteudo_instalacao");

  if (tipoNoPatch || conteudoNoPatch) {
    const tipo = (patch.tipo_instalacao ?? null) as TipoInstalacao;
    const conteudo = (patch.conteudo_instalacao ?? null) as string | null;

    // se conteúdo veio vazio/null -> zera tipo também
    if (!conteudo) {
      patch.conteudo_instalacao = null;
      patch.tipo_instalacao = null;
    } else {
      // conteúdo existe -> precisa ter tipo
      if (!tipo) {
        return NextResponse.json(
          { erro: "Informe tipo_instalacao (video | texto) quando houver conteúdo." },
          { status: 400 }
        );
      }
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ erro: "Nada para atualizar." }, { status: 400 });
  }

  const supabase = criarSupabaseAdmin();

  const { data, error } = await supabase
    .from("daws")
    .update(patch)
    .eq("slug", slug)
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
      ativo
    `
    )
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, daw: data });
}
