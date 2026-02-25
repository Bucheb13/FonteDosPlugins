import { NextResponse } from "next/server";
import { autorizarAdminOuErro } from "@/lib/admin-auth";
import { registrarAuditoriaAdmin } from "@/lib/admin-auditoria";
import { createClient, type User } from "@supabase/supabase-js";

export const runtime = "nodejs";

function jsonErro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function pegarEmail(user: User | null): string | null {
  const email = user?.email;
  return email && email.trim().length > 0 ? email : null;
}

export async function POST(req: Request) {
  const negado = await autorizarAdminOuErro(req);
  if (negado) return negado;

  await registrarAuditoriaAdmin(req, { acao: "POST", entidade: "assinaturas/redefinir-senha" });

  const body = (await req.json().catch(() => null)) as {
    usuarioId?: string;
  } | null;

  const usuarioId = body?.usuarioId;
  if (!usuarioId) {
    return jsonErro("usuarioId é obrigatório.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonErro("Service role não configurado.", 500);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1) buscar usuário no Auth
  const { data: userRes, error: userErr } =
    await supabaseAdmin.auth.admin.getUserById(usuarioId);

  if (userErr) {
    return jsonErro(userErr.message, 400);
  }

  const email = pegarEmail(userRes.user);
  if (!email) {
    return jsonErro("Usuário não possui email.", 404);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const redirectTo = siteUrl ? `${siteUrl.replace(/\/+$/, "")}/redefinir-senha` : undefined;

  // 2) enviar email de recovery uma unica vez
  const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  // 3) gerar link de recovery (debug / fallback)
  const { data: linkData, error: linkErr } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });

  const actionLink = linkData?.properties?.action_link ?? null;
  const podeExporActionLink = process.env.NODE_ENV !== "production";

  if (resetErr) {
    return NextResponse.json({
      ok: false,
      erro: resetErr.message,
      action_link: podeExporActionLink ? actionLink : null,
      aviso:
        "Email pode não ter sido enviado (SMTP/redirect/spam). Use o action_link para testar.",
    });
  }

  if (linkErr) {
    return NextResponse.json({
      ok: true,
      action_link: null,
      aviso: "Email enviado, mas não foi possível gerar link para debug.",
    });
  }

  return NextResponse.json({
    ok: true,
    action_link: podeExporActionLink ? actionLink : null,
  });
}
