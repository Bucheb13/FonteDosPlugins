import { NextResponse } from "next/server";
import { autorizarAdminOuErro } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const negado = await autorizarAdminOuErro(req);
  if (negado) return negado;

  return NextResponse.json({ ok: true });
}
