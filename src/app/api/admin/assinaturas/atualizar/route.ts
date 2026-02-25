import { NextResponse } from "next/server";
import { autorizarAdminOuErro } from "@/lib/admin-auth";
import { registrarAuditoriaAdmin } from "@/lib/admin-auditoria";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

type StatusAssinatura = "ativa" | "inativa";
type TipoAssinatura = "mensal" | "anual";

export async function POST(req: Request) {
  const negado = await autorizarAdminOuErro(req);
  if (negado) return negado;

  await registrarAuditoriaAdmin(req, { acao: "POST", entidade: "assinaturas/atualizar" });

  const bodyUnknown: unknown = await req.json().catch(() => null);
  const body = (bodyUnknown && typeof bodyUnknown === "object" ? bodyUnknown : {}) as Record<string, unknown>;

  const usuarioId = typeof body.usuarioId === "string" ? body.usuarioId : "";
  const status = typeof body.status === "string" ? (body.status as StatusAssinatura) : undefined;
  const tipo = typeof body.tipo === "string" ? (body.tipo as TipoAssinatura) : undefined;

  if (!usuarioId) return NextResponse.json({ erro: "usuarioId inválido" }, { status: 400 });
  if (status !== undefined && status !== "ativa" && status !== "inativa")
    return NextResponse.json({ erro: "status inválido" }, { status: 400 });
  if (tipo !== undefined && tipo !== "mensal" && tipo !== "anual")
    return NextResponse.json({ erro: "tipo inválido" }, { status: 400 });

  const supabase = criarSupabaseAdmin();

  // consulta assinatura existente
  const { data: existenteRaw, error: errExist } = await supabase
    .from("assinaturas")
    .select("id, status, tipo, periodo_fim")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (errExist) {
    return NextResponse.json({ erro: "Falha ao consultar assinatura.", extra: errExist }, { status: 500 });
  }

  type Existente = { id: string; status: StatusAssinatura; tipo: TipoAssinatura | null; periodo_fim: string | null };
  const existente = existenteRaw as Existente | null;

  // prepara patch
  const novoStatus: StatusAssinatura = status ?? existente?.status ?? "inativa";
  let novoTipo: TipoAssinatura | null = null;
  let novoPeriodoFim: string | null = null;

  if (novoStatus === "ativa") {
    novoTipo = tipo ?? existente?.tipo ?? "mensal"; // default para mensal se não existir
    const data = new Date();
    if (novoTipo === "mensal") data.setDate(data.getDate() + 31);
    if (novoTipo === "anual") data.setDate(data.getDate() + 365);
    novoPeriodoFim = data.toISOString();
  } else {
    // inativa → limpa
    novoTipo = null;
    novoPeriodoFim = null;
  }

  const patch = {
    status: novoStatus,
    tipo: novoTipo,
    periodo_fim: novoPeriodoFim,
  };

  if (existente?.id) {
    const { error: errUpd } = await supabase
      .from("assinaturas")
      .update(patch)
      .eq("id", existente.id);

    if (errUpd) return NextResponse.json({ erro: errUpd.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // se não existe, cria
  const { error: errIns } = await supabase.from("assinaturas").insert({
    usuario_id: usuarioId,
    ...patch,
  });

  if (errIns) return NextResponse.json({ erro: errIns.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
