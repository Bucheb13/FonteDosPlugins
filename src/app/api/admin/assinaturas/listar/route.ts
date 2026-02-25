import { NextResponse } from "next/server";
import { autorizarAdminOuErro } from "@/lib/admin-auth";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import type { User } from "@supabase/supabase-js";

type AssinaturaDb = {
  id: string;
  usuario_id: string;
  status: "ativa" | "inativa";
  tipo: "mensal" | "anual" | null;
  periodo_fim: string | null;
  criado_em: string;
};

type AssinaturaResposta = AssinaturaDb & {
  display_name: string | null;
};

type UsuarioDisponivel = {
  id: string;
  display_name: string | null;
};

function extrairDisplayName(user: User | null): string | null {
  if (!user) return null;
  const md = user.user_metadata ?? {};
  const candidatos = [md.display_name, md.full_name, md.name, user.email];
  return candidatos.find((v): v is string => typeof v === "string" && v.trim().length > 0) ?? null;
}

export async function GET(req: Request) {
  const negado = await autorizarAdminOuErro(req);
  if (negado) return negado;

  const supabase = criarSupabaseAdmin();

  // 1) Buscar assinaturas existentes
  const { data: assinaturasData, error: assinaturasErr } = await supabase
    .from("assinaturas")
    .select("id, usuario_id, status, tipo, periodo_fim, criado_em")
    .order("criado_em", { ascending: false })
    .limit(200);

  if (assinaturasErr) {
    return NextResponse.json({ erro: assinaturasErr.message }, { status: 500 });
  }

  const assinaturas = (assinaturasData ?? []) as AssinaturaDb[];

  // 2) Mapear display_name para cada assinatura
  const idsUnicos = Array.from(new Set(assinaturas.map((a) => a.usuario_id)));
  const mapaNomes = new Map<string, string | null>();

  for (const usuarioId of idsUnicos) {
    const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(usuarioId);
    mapaNomes.set(usuarioId, userErr ? null : extrairDisplayName(userRes.user));
  }

  const itens: AssinaturaResposta[] = assinaturas.map((a) => ({
    ...a,
    display_name: mapaNomes.get(a.usuario_id) ?? null,
  }));

  // 3) Buscar usuários disponíveis (que ainda não têm assinatura)
  const usuariosDisponiveis: UsuarioDisponivel[] = [];
  let pagina = 1;
  let maisUsuarios = true;

  while (maisUsuarios) {
    const { data: usersPage, error: usersErr } = await supabase.auth.admin.listUsers({
      page: pagina,
      perPage: 100,
    });

    if (usersErr) break;

    for (const user of usersPage?.users ?? []) {
      if (!assinaturas.some((a) => a.usuario_id === user.id)) {
        usuariosDisponiveis.push({
          id: user.id,
          display_name: extrairDisplayName(user),
        });
      }
    }

    maisUsuarios = (usersPage?.users?.length ?? 0) === 100;
    pagina += 1;
  }

  return NextResponse.json({ itens, usuariosDisponiveis });
}
