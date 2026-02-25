import "server-only";

import { NextResponse } from "next/server";
import { criarSupabaseServidor } from "@/lib/supabase-servidor";

const EMAIL_ADMIN_BYPASS = "fontedosplugins@gmail.com";

export async function autorizarAdmin(req: Request) {
  const senha = req.headers.get("x-senha-admin");
  if (senha && senha === process.env.SENHA_ADMIN) return true;

  const supabase = await criarSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = (user?.email ?? "").trim().toLowerCase();
  return email === EMAIL_ADMIN_BYPASS;
}

export async function autorizarAdminOuErro(req: Request) {
  const ok = await autorizarAdmin(req);
  if (ok) return null;
  return NextResponse.json({ erro: "Acesso negado." }, { status: 401 });
}
