import { NextResponse } from "next/server";
import { autorizarAdminOuErro } from "@/lib/admin-auth";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import type { User } from "@supabase/supabase-js";

type ItemTipo = "plugin" | "drum-kit" | "daw" | "programa";
type ItemTipoOuNulo = ItemTipo | null;

type DownloadRaw = {
  id: string;
  usuario_id: string;
  item_id: string;
  item_tipo: string;
  criado_em: string;
};

type ItemResolvido = {
  id: string;
  nome: string;
  slug: string;
  ativo?: boolean | null;
  tipo: ItemTipo;
};

type AssinaturaDb = {
  id: string;
  usuario_id: string;
  status: "ativa" | "inativa";
  tipo: "mensal" | "anual" | null;
  periodo_fim: string | null;
  criado_em: string;
};

type AuditoriaLinha = {
  id: string;
  criado_em: string;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  admin_email: string | null;
  admin_user_id: string | null;
};

function normalizarTipo(tipo: string): ItemTipo | null {
  const t = tipo.toLowerCase().trim().replaceAll("_", "-");
  if (t === "plugin") return "plugin";
  if (t === "drum-kit" || t === "drumkit") return "drum-kit";
  if (t === "daw") return "daw";
  if (t === "programa") return "programa";
  return null;
}

function extrairNome(user: User | null) {
  if (!user) return null;
  const md = user.user_metadata ?? {};
  const candidatos = [md.display_name, md.full_name, md.name, user.email];
  return candidatos.find((v): v is string => typeof v === "string" && v.trim().length > 0) ?? null;
}

function normalizarPeriodo(raw: string | null) {
  const n = Number(raw ?? 30);
  if ([7, 30, 90, 180, 365].includes(n)) return n;
  return 30;
}

function csvEscape(v: string | number | null | undefined) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replaceAll("\"", '""')}"`;
  }
  return s;
}

function paraMs(iso: string | null | undefined) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function incrementarMapa(mapa: Map<string, number>, chave: string) {
  mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
}

export async function GET(req: Request) {
  const negado = await autorizarAdminOuErro(req);
  if (negado) return negado;

  const url = new URL(req.url);
  const periodoDias = normalizarPeriodo(url.searchParams.get("periodo"));
  const formato = (url.searchParams.get("format") ?? "json").toLowerCase();

  const supabase = criarSupabaseAdmin();

  const [downloadsResp, assinaturasResp, pluginsResp, drumResp, dawsResp, programasResp] = await Promise.all([
    supabase
      .from("downloads")
      .select("id, usuario_id, item_id, item_tipo, criado_em")
      .order("criado_em", { ascending: false })
      .limit(5000),
    supabase
      .from("assinaturas")
      .select("id, usuario_id, status, tipo, periodo_fim, criado_em")
      .order("criado_em", { ascending: false })
      .limit(2000),
    supabase.from("plugins").select("id, nome, slug, ativo, imagem_capa_url, subtitulo, descricao, criado_em"),
    supabase.from("drum_kits").select("id, nome, slug, ativo, imagem_capa_url, subtitulo, descricao, criado_em"),
    supabase.from("daws").select("id, nome, slug, ativo, imagem_capa_url, subtitulo, descricao, criado_em"),
    supabase.from("programas").select("id, nome, slug, ativo, imagem_capa_url, subtitulo, descricao, criado_em"),
  ]);

  if (downloadsResp.error) {
    return NextResponse.json({ erro: downloadsResp.error.message }, { status: 500 });
  }
  if (assinaturasResp.error) {
    return NextResponse.json({ erro: assinaturasResp.error.message }, { status: 500 });
  }

  const downloads = (downloadsResp.data ?? []) as DownloadRaw[];
  const assinaturas = (assinaturasResp.data ?? []) as AssinaturaDb[];
  const pluginsCatalogo = pluginsResp.data ?? [];
  const drumCatalogo = drumResp.data ?? [];
  const dawsCatalogo = dawsResp.data ?? [];
  const programasCatalogo = programasResp.data ?? [];

  const ids: Record<ItemTipo, string[]> = {
    plugin: [],
    "drum-kit": [],
    daw: [],
    programa: [],
  };

  const normalizados = downloads
    .map((d) => {
      const tipo = normalizarTipo(d.item_tipo);
      if (!tipo) return null;
      ids[tipo].push(d.item_id);
      return { ...d, item_tipo: tipo as ItemTipo };
    })
    .filter(Boolean) as (DownloadRaw & { item_tipo: ItemTipo })[];

  const [plugins, drumKits, daws, programas] = await Promise.all([
    ids.plugin.length
      ? supabase.from("plugins").select("id, nome, slug, ativo").in("id", ids.plugin)
      : { data: [] as Array<{ id: string; nome: string; slug: string; ativo: boolean }> },
    ids["drum-kit"].length
      ? supabase.from("drum_kits").select("id, nome, slug, ativo").in("id", ids["drum-kit"])
      : { data: [] as Array<{ id: string; nome: string; slug: string; ativo: boolean }> },
    ids.daw.length
      ? supabase.from("daws").select("id, nome, slug, ativo").in("id", ids.daw)
      : { data: [] as Array<{ id: string; nome: string; slug: string; ativo: boolean }> },
    ids.programa.length
      ? supabase.from("programas").select("id, nome, slug, ativo").in("id", ids.programa)
      : { data: [] as Array<{ id: string; nome: string; slug: string; ativo: boolean }> },
  ]);

  const mapaItens = new Map<string, ItemResolvido>();
  plugins.data?.forEach((p) => mapaItens.set(p.id, { ...p, tipo: "plugin" }));
  drumKits.data?.forEach((d) => mapaItens.set(d.id, { ...d, tipo: "drum-kit" }));
  daws.data?.forEach((d) => mapaItens.set(d.id, { ...d, tipo: "daw" }));
  programas.data?.forEach((p) => mapaItens.set(p.id, { ...p, tipo: "programa" }));

  const usuariosMapa = new Map<string, { email: string | null; nome: string | null; criado_em: string | null }>();
  let pagina = 1;
  let temMais = true;
  while (temMais) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 100 });
    if (error) break;
    const users = data?.users ?? [];
    for (const u of users) {
      usuariosMapa.set(u.id, {
        email: u.email ?? null,
        nome: extrairNome(u),
        criado_em: u.created_at ?? null,
      });
    }
    temMais = users.length === 100;
    pagina += 1;
  }

  const agora = Date.now();
  const msDia = 24 * 60 * 60 * 1000;
  const limitePeriodo = agora - periodoDias * msDia;
  const limite7dias = agora - 7 * msDia;
  const limite30dias = agora - 30 * msDia;

  const downloadsPeriodo: Array<DownloadRaw & { item_tipo: ItemTipo }> = [];
  const usuariosComDownloadPeriodo = new Set<string>();
  const usuariosComDownload30dias = new Set<string>();
  let downloads7dias = 0;
  let downloads30dias = 0;

  for (const d of normalizados) {
    const t = paraMs(d.criado_em);
    if (t === null) continue;

    if (t >= limite7dias) downloads7dias += 1;
    if (t >= limite30dias) {
      downloads30dias += 1;
      usuariosComDownload30dias.add(d.usuario_id);
    }

    if (t >= limitePeriodo) {
      downloadsPeriodo.push(d);
      usuariosComDownloadPeriodo.add(d.usuario_id);
    }
  }

  if (formato === "csv") {
    const header = [
      "usuario_id",
      "email",
      "nome",
      "download_id",
      "criado_em",
      "item_tipo",
      "item_nome",
      "item_slug",
    ];

    const linhas = [header.join(",")];
    for (const d of downloadsPeriodo) {
      const item = mapaItens.get(d.item_id);
      const user = usuariosMapa.get(d.usuario_id);
      linhas.push(
        [
          csvEscape(d.usuario_id),
          csvEscape(user?.email ?? ""),
          csvEscape(user?.nome ?? ""),
          csvEscape(d.id),
          csvEscape(d.criado_em),
          csvEscape(item?.tipo ?? ""),
          csvEscape(item?.nome ?? "Item removido"),
          csvEscape(item?.slug ?? ""),
        ].join(",")
      );
    }

    return new Response(`sep=,\n${linhas.join("\n")}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dashboard-admin-${periodoDias}d.csv"`,
      },
    });
  }

  const grupos = new Map<
    string,
    {
      usuario_id: string;
      email: string | null;
      nome: string | null;
      total_downloads: number;
      ultimo_download_em: string;
      itens: Array<{
        download_id: string;
        criado_em: string;
        item_nome: string;
        item_slug: string | null;
        item_tipo: ItemTipoOuNulo;
      }>;
    }
  >();

  const downloadsPorItem = new Map<
    string,
    { item_id: string; item_nome: string; item_slug: string | null; item_tipo: ItemTipoOuNulo; total: number }
  >();

  const downloadsPorDia = new Map<string, number>();
  for (const d of downloadsPeriodo) {
    const item = mapaItens.get(d.item_id);
    const user = usuariosMapa.get(d.usuario_id) ?? { email: null, nome: null, criado_em: null };

    if (!grupos.has(d.usuario_id)) {
      grupos.set(d.usuario_id, {
        usuario_id: d.usuario_id,
        email: user.email,
        nome: user.nome,
        total_downloads: 0,
        ultimo_download_em: d.criado_em,
        itens: [],
      });
    }

    const g = grupos.get(d.usuario_id)!;
    g.total_downloads += 1;
    const atualMs = paraMs(d.criado_em) ?? 0;
    const ultimoMs = paraMs(g.ultimo_download_em) ?? 0;
    if (atualMs > ultimoMs) {
      g.ultimo_download_em = d.criado_em;
    }
    g.itens.push({
      download_id: d.id,
      criado_em: d.criado_em,
      item_nome: item?.nome ?? "Item removido",
      item_slug: item?.slug ?? null,
      item_tipo: item?.tipo ?? null,
    });

    const chaveItem = `${item?.tipo ?? "unknown"}:${d.item_id}`;
    const atual = downloadsPorItem.get(chaveItem) ?? {
      item_id: d.item_id,
      item_nome: item?.nome ?? "Item removido",
      item_slug: item?.slug ?? null,
      item_tipo: item?.tipo ?? null,
      total: 0,
    };
    atual.total += 1;
    downloadsPorItem.set(chaveItem, atual);

    incrementarMapa(downloadsPorDia, d.criado_em.slice(0, 10));
  }

  const totalUsuarios = usuariosMapa.size;
  let totalCadastrosPeriodo = 0;
  let totalCadastros30dias = 0;
  const cadastrosPorDia = new Map<string, number>();

  for (const u of usuariosMapa.values()) {
    const t = paraMs(u.criado_em);
    if (t === null || !u.criado_em) continue;

    if (t >= limitePeriodo) totalCadastrosPeriodo += 1;
    if (t >= limite30dias) totalCadastros30dias += 1;
    incrementarMapa(cadastrosPorDia, u.criado_em.slice(0, 10));
  }

  const assinaturasAtivas = assinaturas.filter((a) => {
    if (a.status !== "ativa") return false;
    const fimMs = paraMs(a.periodo_fim);
    if (fimMs === null) return true;
    return fimMs >= agora;
  });

  const assinaturasInativas = assinaturas.length - assinaturasAtivas.length;
  const assinaturasMensais = assinaturasAtivas.filter((a) => a.tipo === "mensal").length;
  const assinaturasAnuais = assinaturasAtivas.filter((a) => a.tipo === "anual").length;
  const expiram7dias = assinaturasAtivas.filter((a) => {
    const t = paraMs(a.periodo_fim);
    if (t === null) return false;
    return t >= agora && t <= agora + 7 * msDia;
  }).length;

  const usuariosNoPeriodo = usuariosComDownloadPeriodo.size;
  const usuariosNo30dias = usuariosComDownload30dias.size;

  const conversaoDownloadParaAssinatura =
    usuariosNoPeriodo > 0 ? Number(((assinaturasAtivas.length / usuariosNoPeriodo) * 100).toFixed(1)) : 0;

  const topItens = Array.from(downloadsPorItem.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const todosAtivos = [
    ...pluginsCatalogo.map((p) => ({ ...p, tipo: "plugin" as const })),
    ...drumCatalogo.map((d) => ({ ...d, tipo: "drum-kit" as const })),
    ...dawsCatalogo.map((d) => ({ ...d, tipo: "daw" as const })),
    ...programasCatalogo.map((p) => ({ ...p, tipo: "programa" as const })),
  ].filter((i) => i.ativo !== false);

  const downloadsPorChave = new Map<string, number>();
  for (const it of Array.from(downloadsPorItem.values())) {
    downloadsPorChave.set(`${it.item_tipo}:${it.item_id}`, it.total);
  }

  const itensSemDownload = todosAtivos
    .filter((i) => !downloadsPorChave.has(`${i.tipo}:${i.id}`))
    .slice(0, 15)
    .map((i) => ({ id: i.id, nome: i.nome, slug: i.slug, tipo: i.tipo }));

  const catalogo = [
    ...pluginsCatalogo,
    ...drumCatalogo,
    ...dawsCatalogo,
    ...programasCatalogo,
  ] as Array<{ imagem_capa_url: string | null; descricao: string | null; subtitulo: string | null }>;

  const semCapa = catalogo.filter((i) => !i.imagem_capa_url).length;
  const semDescricao = catalogo.filter((i) => !i.descricao || i.descricao.trim().length === 0).length;
  const semSubtitulo = catalogo.filter((i) => !i.subtitulo || i.subtitulo.trim().length === 0).length;

  const alertas: Array<{ nivel: "alto" | "medio" | "info"; titulo: string; detalhe: string; href?: string }> = [];
  if (expiram7dias > 0) {
    alertas.push({
      nivel: "alto",
      titulo: "Assinaturas expirando",
      detalhe: `${expiram7dias} assinatura(s) expiram em ate 7 dias.`,
      href: "/admin/assinaturas",
    });
  }
  if (semCapa > 0) {
    alertas.push({
      nivel: "medio",
      titulo: "Itens sem capa",
      detalhe: `${semCapa} item(ns) sem imagem de capa no catalogo.`,
    });
  }
  if (downloadsPeriodo.length === 0) {
    alertas.push({
      nivel: "medio",
      titulo: "Sem downloads no periodo",
      detalhe: `Nao houve download nos ultimos ${periodoDias} dias.`,
    });
  }
  if (alertas.length === 0) {
    alertas.push({
      nivel: "info",
      titulo: "Painel estavel",
      detalhe: "Nenhum alerta critico detectado agora.",
    });
  }

  const atividadesRecentes = [
    ...downloadsPeriodo.slice(0, 15).map((d) => {
      const item = mapaItens.get(d.item_id);
      const u = usuariosMapa.get(d.usuario_id);
      return {
        data: d.criado_em,
        tipo: "download",
        descricao: `${u?.email ?? "Usuario"} baixou ${item?.nome ?? "item removido"}`,
      };
    }),
    ...pluginsCatalogo.slice(0, 5).map((p) => ({
      data: p.criado_em as string,
      tipo: "conteudo",
      descricao: `Plugin publicado: ${p.nome}`,
    })),
    ...dawsCatalogo.slice(0, 5).map((d) => ({
      data: d.criado_em as string,
      tipo: "conteudo",
      descricao: `DAW publicado: ${d.nome}`,
    })),
    ...drumCatalogo.slice(0, 5).map((d) => ({
      data: d.criado_em as string,
      tipo: "conteudo",
      descricao: `Drum-Kit publicado: ${d.nome}`,
    })),
    ...programasCatalogo.slice(0, 5).map((p) => ({
      data: p.criado_em as string,
      tipo: "conteudo",
      descricao: `Programa publicado: ${p.nome}`,
    })),
  ]
    .filter((a) => a.data)
    .sort((a, b) => (paraMs(b.data) ?? 0) - (paraMs(a.data) ?? 0))
    .slice(0, 20);

  const usuarios = Array.from(grupos.values())
    .map((u) => ({ ...u, itens: u.itens.slice(0, 12) }))
    .sort((a, b) => b.total_downloads - a.total_downloads);

  const tendencias = Array.from({ length: periodoDias }).map((_, i) => {
    const base = new Date(agora - (periodoDias - 1 - i) * msDia);
    const chave = base.toISOString().slice(0, 10);
    return {
      dia: chave,
      downloads: downloadsPorDia.get(chave) ?? 0,
      cadastros: cadastrosPorDia.get(chave) ?? 0,
    };
  });

  let auditoria: AuditoriaLinha[] = [];
  let auditoriaDisponivel = true;
  let auditoriaErro: string | null = null;
  const logsResp = await supabase
    .from("admin_logs")
    .select("id, criado_em, acao, entidade, entidade_id, admin_email, admin_user_id")
    .order("criado_em", { ascending: false })
    .limit(40);

  if (logsResp.error) {
    auditoriaDisponivel = false;
    auditoriaErro = logsResp.error.message;
  } else {
    auditoria = (logsResp.data ?? []) as AuditoriaLinha[];
  }

  return NextResponse.json({
    periodo_dias: periodoDias,
    resumo: {
      total_downloads: downloadsPeriodo.length,
      usuarios_com_download: usuariosNoPeriodo,
      downloads_30_dias: downloads30dias,
      downloads_7_dias: downloads7dias,
    },
    funil: {
      visitantes_30_dias: null,
      cadastros_total: totalUsuarios,
      cadastros_periodo: totalCadastrosPeriodo,
      cadastros_30_dias: totalCadastros30dias,
      usuarios_com_download: usuariosNoPeriodo,
      usuarios_com_download_30_dias: usuariosNo30dias,
      assinaturas_ativas: assinaturasAtivas.length,
      conversao_download_para_assinatura: conversaoDownloadParaAssinatura,
    },
    financeiro: {
      assinaturas_ativas: assinaturasAtivas.length,
      assinaturas_inativas: assinaturasInativas,
      planos_mensais_ativos: assinaturasMensais,
      planos_anuais_ativos: assinaturasAnuais,
      expirando_7_dias: expiram7dias,
    },
    saude_conteudo: {
      total_itens_catalogo: catalogo.length,
      itens_sem_capa: semCapa,
      itens_sem_descricao: semDescricao,
      itens_sem_subtitulo: semSubtitulo,
      itens_sem_download_na_janela: itensSemDownload.length,
    },
    saude_downloads: {
      top_itens: topItens,
      itens_sem_download: itensSemDownload,
    },
    alertas,
    tendencias,
    atividades_recentes: atividadesRecentes,
    auditoria_disponivel: auditoriaDisponivel,
    auditoria_erro: auditoriaErro,
    auditoria,
    usuarios,
  });
}
