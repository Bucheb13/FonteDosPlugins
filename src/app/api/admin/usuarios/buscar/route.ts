import { NextResponse } from "next/server";
import { autorizarAdminOuErro } from "@/lib/admin-auth";
import { registrarAuditoriaAdmin } from "@/lib/admin-auditoria";
import { createClient } from "@supabase/supabase-js";

function supabaseAdminAuth() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: Request) {
  const negado = await autorizarAdminOuErro(req);
  if (negado) return negado;

  await registrarAuditoriaAdmin(req, { acao: "POST", entidade: "usuarios/buscar" });

  const body = await req.json().catch(() => null) as { email?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();

  if (!email) return NextResponse.json({ erro: "Email é obrigatório" }, { status: 400 });

  const sb = supabaseAdminAuth();

  // lista e filtra por email (Admin API)
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const user = data.users.find((u) => (u.email ?? "").toLowerCase() === email);

  if (!user) return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    usuario: { id: user.id, email: user.email, criado_em: user.created_at },
  });
}
