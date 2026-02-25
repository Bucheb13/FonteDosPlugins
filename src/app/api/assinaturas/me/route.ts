// /api/assinaturas/me.ts
import { NextResponse } from "next/server";
import { criarSupabaseServidor } from "@/lib/supabase-servidor";

export async function GET() {
  try {
    const supabase = await criarSupabaseServidor();

    // Aqui você precisa pegar o usuário logado
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

    const { data, error } = await supabase
      .from("assinaturas")
      .select("*")
      .eq("usuario_id", user.id)
      .single();

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

    return NextResponse.json({ assinatura: data });
  } catch {
    return NextResponse.json({ erro: "Erro ao buscar assinatura" }, { status: 500 });
  }
}
