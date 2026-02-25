// src/app/api/minha-conta/route.ts
import { NextResponse } from "next/server";
import { criarSupabaseServidor } from "@/lib/supabase-servidor";

type StatusAssinatura = "ativa" | "inativa";
type ItemTipo = "plugin" | "drum-kit" | "daw" | "programa";

type ItemResolvido = {
  id: string;
  nome: string;
  slug: string;
  imagem_capa_url: string | null;
  tipo: ItemTipo;
};

type DownloadFinal = {
  id: string;
  criado_em: string;
  item?: ItemResolvido;
};

export async function GET() {
  try {
    const supabase = await criarSupabaseServidor();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const usuario = authData.user;

    // Assinatura
    const { data: assinatura } = await supabase
      .from("assinaturas")
      .select("id, status, periodo_fim, tipo")
      .eq("usuario_id", usuario.id)
      .maybeSingle();

    let statusAssinatura: StatusAssinatura =
      assinatura?.status?.toLowerCase().trim() === "ativa" ? "ativa" : "inativa";

    // Verifica se a assinatura expirou
    if (statusAssinatura === "ativa" && assinatura?.periodo_fim) {
      const agora = new Date();
      const fim = new Date(assinatura.periodo_fim);
      if (fim < agora) {
        statusAssinatura = "inativa";
        // Atualiza assinatura para inativa no banco
        if (assinatura.id) {
          await supabase
            .from("assinaturas")
            .update({ status: "inativa", tipo: null, periodo_fim: null })
            .eq("id", assinatura.id);
        }
      }
    }

    const fimAssinatura =
      statusAssinatura === "ativa" && assinatura?.periodo_fim
        ? new Date(assinatura.periodo_fim).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : null;

    const labelAssinatura =
      statusAssinatura === "ativa" && fimAssinatura
        ? `Ativa até ${fimAssinatura}`
        : "Inativa";

    // Total downloads
    const { count } = await supabase
      .from("downloads")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", usuario.id);

    const totalDownloads = count ?? 0;

    // Últimos 30 downloads
    const { data: downloadsRaw } = await supabase
      .from("downloads")
      .select("id, criado_em, item_id, item_tipo")
      .eq("usuario_id", usuario.id)
      .order("criado_em", { ascending: false })
      .limit(30);

    const downloads = downloadsRaw ?? [];

    // Separar IDs por tipo
    const ids: Record<ItemTipo, string[]> = {
      plugin: [],
      "drum-kit": [],
      daw: [],
      programa: [],
    };

    const normalizarTipo = (tipo: string): ItemTipo | null => {
      const t = tipo.toLowerCase().replaceAll("_", "-").trim();
      if (t === "plugin") return "plugin";
      if (t === "drum-kit" || t === "drumkit") return "drum-kit";
      if (t === "daw") return "daw";
      if (t === "programa") return "programa";
      return null;
    };

    const downloadsNormalizados = downloads
      .map((d) => {
        const tipo = normalizarTipo(d.item_tipo);
        if (!tipo) return null;
        ids[tipo].push(d.item_id);
        return { ...d, item_tipo: tipo };
      })
      .filter(Boolean) as (typeof downloads[0] & { item_tipo: ItemTipo })[];

    const [plugins, drumkits, daws, programas] = await Promise.all([
      ids.plugin.length
        ? supabase.from("plugins").select("id, nome, slug, imagem_capa_url").in("id", ids.plugin)
        : { data: [] },
      ids["drum-kit"].length
        ? supabase.from("drum_kits").select("id, nome, slug, imagem_capa_url").in("id", ids["drum-kit"])
        : { data: [] },
      ids.daw.length
        ? supabase.from("daws").select("id, nome, slug, imagem_capa_url").in("id", ids.daw)
        : { data: [] },
      ids.programa.length
        ? supabase.from("programas").select("id, nome, slug, imagem_capa_url").in("id", ids.programa)
        : { data: [] },
    ]);

    const mapa = new Map<string, ItemResolvido>();
    plugins.data?.forEach((p) => mapa.set(p.id, { ...p, tipo: "plugin" }));
    drumkits.data?.forEach((d) => mapa.set(d.id, { ...d, tipo: "drum-kit" }));
    daws.data?.forEach((d) => mapa.set(d.id, { ...d, tipo: "daw" }));
    programas.data?.forEach((p) => mapa.set(p.id, { ...p, tipo: "programa" }));

    const listaDownloads: DownloadFinal[] = downloadsNormalizados.map((d) => ({
      id: d.id,
      criado_em: d.criado_em,
      item: mapa.get(d.item_id),
    }));

    return NextResponse.json({
      usuario: {
        email: usuario.email ?? "",
        user_metadata: usuario.user_metadata ?? {},
      },
      statusAssinatura,
      labelAssinatura,
      totalDownloads,
      listaDownloads,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
