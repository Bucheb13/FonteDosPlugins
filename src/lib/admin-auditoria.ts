import "server-only";

import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import { criarSupabaseServidor } from "@/lib/supabase-servidor";

type PayloadAuditoria = {
  acao: string;
  entidade: string;
  entidade_id?: string | null;
  detalhes?: Record<string, unknown>;
};

export async function registrarAuditoriaAdmin(req: Request, payload: PayloadAuditoria) {
  try {
    const supabaseServidor = await criarSupabaseServidor();
    const {
      data: { user },
    } = await supabaseServidor.auth.getUser();

    const adminEmail = (user?.email ?? "").trim().toLowerCase() || null;
    const adminUserId = user?.id ?? null;

    const supabaseAdmin = criarSupabaseAdmin();
    await supabaseAdmin.from("admin_logs").insert({
      acao: payload.acao,
      entidade: payload.entidade,
      entidade_id: payload.entidade_id ?? null,
      admin_email: adminEmail,
      admin_user_id: adminUserId,
      detalhes: payload.detalhes ?? null,
      origem: new URL(req.url).pathname,
    });
  } catch {
    // melhor esforço: não bloqueia fluxo principal
  }
}
