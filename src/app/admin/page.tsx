"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/admin-contexto";
import "./AdminDashboard.css";

type ItemTipo = "plugin" | "drum-kit" | "daw" | "programa" | null;

type ItemDownload = {
  download_id: string;
  criado_em: string;
  item_nome: string;
  item_slug: string | null;
  item_tipo: ItemTipo;
};

type UsuarioDownloads = {
  usuario_id: string;
  email: string | null;
  nome: string | null;
  total_downloads: number;
  ultimo_download_em: string;
  itens: ItemDownload[];
};

type DashboardAdmin = {
  periodo_dias: number;
  resumo: {
    total_downloads: number;
    usuarios_com_download: number;
    downloads_30_dias: number;
    downloads_7_dias: number;
  };
  funil: {
    visitantes_30_dias: number | null;
    cadastros_total: number;
    cadastros_periodo: number;
    cadastros_30_dias: number;
    usuarios_com_download: number;
    usuarios_com_download_30_dias: number;
    assinaturas_ativas: number;
    conversao_download_para_assinatura: number;
  };
  financeiro: {
    assinaturas_ativas: number;
    assinaturas_inativas: number;
    planos_mensais_ativos: number;
    planos_anuais_ativos: number;
    expirando_7_dias: number;
  };
  saude_conteudo: {
    total_itens_catalogo: number;
    itens_sem_capa: number;
    itens_sem_descricao: number;
    itens_sem_subtitulo: number;
    itens_sem_download_na_janela: number;
  };
  saude_downloads: {
    top_itens: Array<{ item_id: string; item_nome: string; item_slug: string | null; item_tipo: ItemTipo; total: number }>;
    itens_sem_download: Array<{ id: string; nome: string; slug: string; tipo: ItemTipo }>;
  };
  alertas: Array<{ nivel: "alto" | "medio" | "info"; titulo: string; detalhe: string; href?: string }>;
  tendencias: Array<{ dia: string; downloads: number; cadastros: number }>;
  atividades_recentes: Array<{ data: string; tipo: string; descricao: string }>;
  auditoria_disponivel: boolean;
  auditoria_erro: string | null;
  auditoria: Array<{
    id: string;
    criado_em: string;
    acao: string;
    entidade: string;
    entidade_id: string | null;
    admin_email: string | null;
    admin_user_id: string | null;
  }>;
  usuarios: UsuarioDownloads[];
};

type UsuarioBusca = {
  id: string;
  email: string;
  criado_em: string;
};

type OrdenacaoUsuarios = "downloads_desc" | "recent_desc" | "nome_asc";

type PontoGrafico = {
  x: number;
  y: number;
  dia: string;
  downloads: number;
  cadastros: number;
};

async function lerJsonSeguro(res: Response) {
  const texto = await res.text();
  try {
    return texto ? JSON.parse(texto) : {};
  } catch {
    return { erro: texto || "Resposta invalida do servidor." };
  }
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDiaIso(diaIso: string) {
  const partes = diaIso.split("-");
  if (partes.length !== 3) return diaIso;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function labelTipo(tipo: ItemTipo) {
  if (tipo === "plugin") return "Plugin";
  if (tipo === "drum-kit") return "Drum-Kit";
  if (tipo === "daw") return "DAW";
  if (tipo === "programa") return "Programa";
  return "Item";
}

function classeAlerta(nivel: "alto" | "medio" | "info") {
  if (nivel === "alto") return "border-red-400/30 bg-red-500/10 text-red-100";
  if (nivel === "medio") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";
}

function textoOrdenacao(v: OrdenacaoUsuarios) {
  if (v === "downloads_desc") return "Mais downloads";
  if (v === "recent_desc") return "Mais recentes";
  return "Nome (A-Z)";
}

function gerarPathLinha(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

export default function PaginaAdmin() {
  const { senhaAdmin, setMensagem, setAcaoHeader } = useAdmin();

  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [dados, setDados] = useState<DashboardAdmin | null>(null);
  const [periodoDias, setPeriodoDias] = useState<7 | 30 | 90 | 180 | 365>(30);

  const [emailBusca, setEmailBusca] = useState("");
  const [buscandoUsuario, setBuscandoUsuario] = useState(false);
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<UsuarioBusca | null>(null);
  const [redefinindo, setRedefinindo] = useState(false);

  const [ordenacaoUsuarios, setOrdenacaoUsuarios] = useState<OrdenacaoUsuarios>("downloads_desc");
  const [paginaUsuarios, setPaginaUsuarios] = useState(1);
  const usuariosPorPagina = 8;
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  const [pontoHover, setPontoHover] = useState<PontoGrafico | null>(null);

  const carregar = useCallback(
    async (periodoSobrescrito?: number) => {
      setMensagem(null);
      if (!senhaAdmin) {
        setMensagem("Digite a senha do admin ou entre com o email autorizado.");
        return;
      }

      const periodo = periodoSobrescrito ?? periodoDias;
      setCarregando(true);
      const res = await fetch(`/api/admin/downloads/relatorio?periodo=${periodo}`, {
        headers: { "x-senha-admin": senhaAdmin },
        cache: "no-store",
      });

      const json = (await lerJsonSeguro(res)) as DashboardAdmin & { erro?: string };
      setCarregando(false);

      if (!res.ok) {
        setMensagem(json.erro ?? "Erro ao carregar dashboard.");
        return;
      }

      setDados(json);
      setPaginaUsuarios(1);
      const agoraIso = new Date().toISOString();
      setUltimaAtualizacao(agoraIso);
      setMensagem(`Painel atualizado (${formatarDataHora(agoraIso)}).`);
    },
    [senhaAdmin, setMensagem, periodoDias]
  );

  const exportarCsv = useCallback(async () => {
    setMensagem(null);
    if (!senhaAdmin) {
      setMensagem("Digite a senha do admin ou entre com o email autorizado.");
      return;
    }

    const res = await fetch(`/api/admin/downloads/relatorio?periodo=${periodoDias}&format=csv`, {
      headers: { "x-senha-admin": senhaAdmin },
      cache: "no-store",
    });

    if (!res.ok) {
      const json = (await lerJsonSeguro(res)) as { erro?: string };
      setMensagem(json.erro ?? "Falha ao exportar CSV.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-admin-${periodoDias}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [senhaAdmin, setMensagem, periodoDias]);

  const buscarUsuario = useCallback(async () => {
    setMensagem(null);
    setUsuarioEncontrado(null);

    if (!senhaAdmin) {
      setMensagem("Digite a senha do admin ou entre com o email autorizado.");
      return;
    }

    const email = emailBusca.trim().toLowerCase();
    if (!email) {
      setMensagem("Informe um email para busca.");
      return;
    }

    setBuscandoUsuario(true);
    const res = await fetch("/api/admin/usuarios/buscar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-senha-admin": senhaAdmin,
      },
      body: JSON.stringify({ email }),
    });

    const json = (await lerJsonSeguro(res)) as { erro?: string; usuario?: UsuarioBusca };
    setBuscandoUsuario(false);

    if (!res.ok) {
      setMensagem(json.erro ?? "Erro ao buscar usuario.");
      return;
    }

    if (json.usuario) {
      setUsuarioEncontrado(json.usuario);
      setMensagem("Usuario localizado.");
    }
  }, [emailBusca, senhaAdmin, setMensagem]);

  const redefinirSenha = useCallback(async () => {
    if (!usuarioEncontrado || !senhaAdmin) return;

    setMensagem(null);
    setRedefinindo(true);
    const res = await fetch("/api/admin/assinaturas/redefinir-senha", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-senha-admin": senhaAdmin,
      },
      body: JSON.stringify({ usuarioId: usuarioEncontrado.id }),
    });

    const json = (await lerJsonSeguro(res)) as { erro?: string; aviso?: string };
    setRedefinindo(false);

    if (!res.ok) {
      setMensagem(json.erro ?? "Erro ao enviar redefinicao de senha.");
      return;
    }

    setMensagem(json.aviso ?? "Email de redefinicao enviado.");
  }, [senhaAdmin, usuarioEncontrado, setMensagem]);

  useEffect(() => {
    setAcaoHeader({
      rotulo: "Atualizar painel",
      carregando,
      aoClicar: () => carregar(),
    });
    return () => setAcaoHeader(null);
  }, [setAcaoHeader, carregando, carregar]);

  const usuariosFiltrados = useMemo(() => {
    if (!dados) return [];
    const termo = filtro.trim().toLowerCase();

    const base = !termo
      ? dados.usuarios
      : dados.usuarios.filter((u) => {
          const alvo = `${u.nome ?? ""} ${u.email ?? ""} ${u.usuario_id}`.toLowerCase();
          if (alvo.includes(termo)) return true;
          return u.itens.some((i) => `${i.item_nome} ${i.item_tipo ?? ""} ${i.item_slug ?? ""}`.toLowerCase().includes(termo));
        });

    if (ordenacaoUsuarios === "nome_asc") {
      return [...base].sort((a, b) => (a.nome ?? a.email ?? "").localeCompare(b.nome ?? b.email ?? "", "pt-BR"));
    }

    if (ordenacaoUsuarios === "recent_desc") {
      return [...base].sort((a, b) => new Date(b.ultimo_download_em).getTime() - new Date(a.ultimo_download_em).getTime());
    }

    return [...base].sort((a, b) => b.total_downloads - a.total_downloads);
  }, [dados, filtro, ordenacaoUsuarios]);

  const totalPaginasUsuarios = Math.max(1, Math.ceil(usuariosFiltrados.length / usuariosPorPagina));
  const paginaAtualUsuarios = Math.min(Math.max(1, paginaUsuarios), totalPaginasUsuarios);

  const irPaginaAnterior = useCallback(() => {
    setPaginaUsuarios((v) => Math.max(1, Math.min(totalPaginasUsuarios, v - 1)));
  }, [totalPaginasUsuarios]);

  const irPaginaProxima = useCallback(() => {
    setPaginaUsuarios((v) => Math.max(1, Math.min(totalPaginasUsuarios, v + 1)));
  }, [totalPaginasUsuarios]);

  const usuariosPagina = useMemo(() => {
    const inicio = (paginaAtualUsuarios - 1) * usuariosPorPagina;
    return usuariosFiltrados.slice(inicio, inicio + usuariosPorPagina);
  }, [usuariosFiltrados, paginaAtualUsuarios]);

  const picoDownloads = useMemo(() => Math.max(1, ...(dados?.tendencias.map((t) => t.downloads) ?? [0])), [dados]);
  const picoCadastros = useMemo(() => Math.max(1, ...(dados?.tendencias.map((t) => t.cadastros) ?? [0])), [dados]);
  const picoGeralGrafico = useMemo(() => Math.max(1, picoDownloads, picoCadastros), [picoDownloads, picoCadastros]);

  const chart = useMemo(() => {
    const width = 860;
    const height = 260;
    const padX = 24;
    const padY = 18;
    const baseY = height - padY;
    const steps = Math.max(1, (dados?.tendencias.length ?? 1) - 1);
    const stepX = (width - padX * 2) / steps;

    const pontosDownloads: PontoGrafico[] = (dados?.tendencias ?? []).map((p, i) => ({
      dia: p.dia,
      downloads: p.downloads,
      cadastros: p.cadastros,
      x: padX + stepX * i,
      y: baseY - (p.downloads / picoGeralGrafico) * (height - padY * 2),
    }));

    const pontosCadastros = (dados?.tendencias ?? []).map((p, i) => ({
      dia: p.dia,
      downloads: p.downloads,
      cadastros: p.cadastros,
      x: padX + stepX * i,
      y: baseY - (p.cadastros / picoGeralGrafico) * (height - padY * 2),
    }));

    const linhaDownloads = gerarPathLinha(pontosDownloads);
    const linhaCadastros = gerarPathLinha(pontosCadastros);
    const areaDownloads =
      pontosDownloads.length > 1
        ? `${linhaDownloads} L ${pontosDownloads[pontosDownloads.length - 1].x.toFixed(2)} ${baseY.toFixed(2)} L ${pontosDownloads[0].x.toFixed(2)} ${baseY.toFixed(2)} Z`
        : "";

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const y = baseY - ratio * (height - padY * 2);
      return { y, value: Math.round(picoGeralGrafico * ratio) };
    });

    return { width, height, padX, baseY, pontosDownloads, linhaDownloads, linhaCadastros, areaDownloads, ticks };
  }, [dados?.tendencias, picoGeralGrafico]);

  return (
    <section className="adminDash space-y-6">
      <header className="adminHero p-5 md:p-6">
        <div className="adminHeroGlow" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Central de Alquimia!</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[7, 30, 90, 180, 365].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setPeriodoDias(v as 7 | 30 | 90 | 180 | 365);
                  void carregar(v);
                }}
                className={`periodChip ${periodoDias === v ? "isActive" : ""}`}
              >
                {v}d
              </button>
            ))}
            <button type="button" onClick={() => void exportarCsv()} className="periodChip">
              Exportar CSV
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="kpiCard">
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Downloads no periodo</p>
          <strong className="mt-1 block text-3xl">{dados?.resumo.total_downloads ?? "-"}</strong>
          <span className="text-xs text-cyan-200/80">{dados?.resumo.downloads_7_dias ?? 0} em 7 dias</span>
        </article>
        <article className="kpiCard">
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Usuarios ativos</p>
          <strong className="mt-1 block text-3xl">{dados?.resumo.usuarios_com_download ?? "-"}</strong>
          <span className="text-xs text-white/70">com pelo menos 1 download</span>
        </article>
        <article className="kpiCard">
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Assinaturas ativas</p>
          <strong className="mt-1 block text-3xl">{dados?.financeiro.assinaturas_ativas ?? "-"}</strong>
          <span className="text-xs text-white/70">{dados?.financeiro.expirando_7_dias ?? 0} expiram em 7 dias</span>
        </article>
        <article className="kpiCard">
          <p className="text-xs uppercase tracking-[0.16em] text-white/55">Conversao</p>
          <strong className="mt-1 block text-3xl">{dados?.funil.conversao_download_para_assinatura ?? "-"}%</strong>
          <span className="text-xs text-pink-200/80">download para assinatura</span>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="glassPanel p-4 xl:col-span-2">
          <h3 className="text-sm uppercase tracking-[0.16em] text-white/65">Tendencia diaria ({periodoDias} dias)</h3>
          <div className="chartScroll mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3">
            <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-[250px] w-full min-w-[720px]" role="img" aria-label="Grafico de tendencia de downloads e cadastros">
              <defs>
                <linearGradient id="gradDownloadsArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34,211,238,0.45)" />
                  <stop offset="100%" stopColor="rgba(34,211,238,0.03)" />
                </linearGradient>
                <linearGradient id="gradDownloadsLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="rgba(34,211,238,1)" />
                  <stop offset="100%" stopColor="rgba(56,189,248,0.9)" />
                </linearGradient>
                <linearGradient id="gradCadastrosLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="rgba(74,222,128,0.95)" />
                  <stop offset="100%" stopColor="rgba(16,185,129,0.9)" />
                </linearGradient>
              </defs>

              {chart.ticks.map((t) => (
                <g key={`tick-${t.y}`}>
                  <line x1={chart.padX} x2={chart.width - chart.padX} y1={t.y} y2={t.y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 6" />
                  <text x={4} y={t.y + 4} fill="rgba(255,255,255,0.45)" fontSize="11">{t.value}</text>
                </g>
              ))}

              {chart.areaDownloads ? <path d={chart.areaDownloads} fill="url(#gradDownloadsArea)" /> : null}
              {chart.linhaDownloads ? <path d={chart.linhaDownloads} fill="none" stroke="url(#gradDownloadsLine)" strokeWidth="3" strokeLinecap="round" /> : null}
              {chart.linhaCadastros ? <path d={chart.linhaCadastros} fill="none" stroke="url(#gradCadastrosLine)" strokeWidth="2.5" strokeLinecap="round" /> : null}

              {chart.pontosDownloads.map((p) => (
                <g key={`hover-${p.dia}`}>
                  <line
                    x1={p.x}
                    x2={p.x}
                    y1={18}
                    y2={chart.baseY}
                    stroke={pontoHover?.dia === p.dia ? "rgba(255,255,255,0.18)" : "transparent"}
                    strokeDasharray="4 6"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={pontoHover?.dia === p.dia ? 4 : 3}
                    fill={pontoHover?.dia === p.dia ? "rgba(34,211,238,1)" : "rgba(34,211,238,0.8)"}
                  />
                  <rect
                    x={p.x - 8}
                    y={18}
                    width={16}
                    height={chart.baseY - 18}
                    fill="transparent"
                    onMouseEnter={() => setPontoHover(p)}
                    onMouseLeave={() => setPontoHover(null)}
                  />
                </g>
              ))}

              {chart.pontosDownloads.filter((_, i) => i % Math.max(1, Math.floor(chart.pontosDownloads.length / 10)) === 0).map((p) => (
                <text key={`dia-${p.dia}`} x={p.x} y={chart.baseY + 16} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10">
                  {formatarDiaIso(p.dia).slice(0, 5)}
                </text>
              ))}
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/60">
            <span className="inline-flex items-center gap-2"><span className="inline-block h-2 w-4 rounded bg-cyan-400" /> Downloads</span>
            <span className="inline-flex items-center gap-2"><span className="inline-block h-2 w-4 rounded bg-emerald-400" /> Cadastros</span>
          </div>
          <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70">
            {pontoHover ? (
              <>
                <strong className="text-white">Dia {formatarDiaIso(pontoHover.dia)}</strong> | Downloads: {pontoHover.downloads} | Cadastros: {pontoHover.cadastros}
              </>
            ) : (
              <>Passe o mouse no gráfico para ver os valores do dia.</>
            )}
          </div>
        </section>

        <section className="glassPanel p-4">
          <h3 className="text-sm uppercase tracking-[0.16em] text-white/65">Funil e receita</h3>
          <div className="mt-3 space-y-1 text-sm text-white/80">
            <div>Cadastros totais: {dados?.funil.cadastros_total ?? "-"}</div>
            <div>Cadastros no periodo: {dados?.funil.cadastros_periodo ?? "-"}</div>
            <div>Downloads 30 dias: {dados?.resumo.downloads_30_dias ?? "-"}</div>
            <div>Planos mensais ativos: {dados?.financeiro.planos_mensais_ativos ?? "-"}</div>
            <div>Planos anuais ativos: {dados?.financeiro.planos_anuais_ativos ?? "-"}</div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="glassPanel p-4 xl:col-span-2">
          <h3 className="text-sm uppercase tracking-[0.16em] text-white/65">Alertas automaticos</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {dados?.alertas.map((a, i) => (
              <div key={`${a.titulo}-${i}`} className={`rounded-xl border p-3 ${classeAlerta(a.nivel)}`}>
                <p className="font-semibold">{a.titulo}</p>
                <p className="text-sm opacity-90">{a.detalhe}</p>
                {a.href ? <Link href={a.href} className="mt-1 inline-block text-xs underline">Abrir</Link> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="glassPanel p-4">
          <h3 className="text-sm uppercase tracking-[0.16em] text-white/65">Saude de conteudo</h3>
          <div className="mt-3 space-y-1 text-sm text-white/80">
            <div>Total no catalogo: {dados?.saude_conteudo.total_itens_catalogo ?? "-"}</div>
            <div>Sem capa: {dados?.saude_conteudo.itens_sem_capa ?? "-"}</div>
            <div>Sem descricao: {dados?.saude_conteudo.itens_sem_descricao ?? "-"}</div>
            <div>Sem subtitulo: {dados?.saude_conteudo.itens_sem_subtitulo ?? "-"}</div>
            <div>Sem download: {dados?.saude_conteudo.itens_sem_download_na_janela ?? "-"}</div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="glassPanel p-4">
          <h3 className="text-sm uppercase tracking-[0.16em] text-white/65">Top downloads</h3>
          <div className="mt-3 space-y-2">
            {dados?.saude_downloads.top_itens.slice(0, 10).map((it) => (
              <article key={`${it.item_tipo}:${it.item_id}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-sm font-medium">{it.item_nome}</p>
                <p className="text-xs text-white/60">{labelTipo(it.item_tipo)} | {it.total} downloads</p>
              </article>
            ))}
          </div>
        </section>

        <section className="glassPanel p-4">
          <h3 className="text-sm uppercase tracking-[0.16em] text-white/65">Busca global de usuario</h3>
          <div className="mt-3 flex gap-2">
            <input
              value={emailBusca}
              onChange={(e) => setEmailBusca(e.target.value)}
              placeholder="email@dominio.com"
              className="w-full rounded-xl border border-white/12 bg-black/35 p-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => void buscarUsuario()}
              disabled={buscandoUsuario}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {buscandoUsuario ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {usuarioEncontrado ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <p>ID: {usuarioEncontrado.id}</p>
              <p>Email: {usuarioEncontrado.email}</p>
              <p className="text-xs text-white/60">Criado em: {formatarData(usuarioEncontrado.criado_em)}</p>
              <button
                type="button"
                onClick={() => void redefinirSenha()}
                disabled={redefinindo}
                className="mt-3 rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-50"
              >
                {redefinindo ? "Enviando..." : "Redefinir senha"}
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <section className="glassPanel p-4">
        <h3 className="text-sm uppercase tracking-[0.16em] text-white/65">Acoes rapidas</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-3 xl:grid-cols-6">
          <Link href="/admin/plugins" className="actionTile">Gerir plugins</Link>
          <Link href="/admin/daws" className="actionTile">Gerir daws</Link>
          <Link href="/admin/drum-kit" className="actionTile">Gerir drum-kits</Link>
          <Link href="/admin/programas" className="actionTile">Gerir programas</Link>
          <Link href="/admin/assinaturas" className="actionTile">Gerir assinaturas</Link>
          <button type="button" onClick={() => void carregar()} className="actionTile text-left" disabled={carregando}>
            {carregando ? "Recalculando..." : "Recalcular metricas"}
          </button>
        </div>
        <p className="mt-2 text-xs text-white/55">
          {ultimaAtualizacao ? `Ultima atualizacao: ${formatarDataHora(ultimaAtualizacao)}` : "Painel ainda nao atualizado nesta sessao."}
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="glassPanel p-4">
          <h3 className="text-sm uppercase tracking-[0.16em] text-white/65">Atividade recente</h3>
          <div className="mt-3 space-y-2">
            {dados?.atividades_recentes.slice(0, 10).map((a, i) => (
              <div key={`${a.data}-${i}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                <p className="font-medium">{a.descricao}</p>
                <p className="text-xs text-white/55">{a.tipo} | {formatarDataHora(a.data)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glassPanel p-4">
          <h3 className="text-sm uppercase tracking-[0.16em] text-white/65">Auditoria admin</h3>
          {!dados?.auditoria_disponivel ? (
            <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-100">
              <p>Tabela admin_logs nao encontrada ou sem permissao.</p>
              <p className="mt-1 text-xs text-amber-100/80">Detalhe: {dados?.auditoria_erro ?? "erro desconhecido"}</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {dados?.auditoria.slice(0, 10).map((log) => (
                <article key={log.id} className="auditItem">
                  <p className="text-sm font-medium">{log.acao} | {log.entidade}</p>
                  <p className="text-xs text-white/55">{log.admin_email ?? "admin"} | {formatarDataHora(log.criado_em)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="glassPanel p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm uppercase tracking-[0.16em] text-white/65">Usuarios e downloads</h3>
            <p className="mt-1 text-xs text-white/55">Visao operacional com busca, ordenacao e paginação.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={filtro}
              onChange={(e) => {
                setFiltro(e.target.value);
                setPaginaUsuarios(1);
              }}
              placeholder="Filtrar por nome, email, item..."
              className="w-64 rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const proxima: OrdenacaoUsuarios =
                  ordenacaoUsuarios === "downloads_desc"
                    ? "recent_desc"
                    : ordenacaoUsuarios === "recent_desc"
                    ? "nome_asc"
                    : "downloads_desc";
                setOrdenacaoUsuarios(proxima);
                setPaginaUsuarios(1);
              }}
              className="rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-xs"
            >
              Ordenar: {textoOrdenacao(ordenacaoUsuarios)}
            </button>
          </div>
        </div>

        <div className="mt-4 hidden overflow-x-auto rounded-xl border border-white/10 md:block">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.12em] text-white/60">
              <tr>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Downloads</th>
                <th className="px-3 py-2">Ultimo download</th>
                <th className="px-3 py-2">Ultimos itens</th>
              </tr>
            </thead>
            <tbody>
              {usuariosPagina.map((u) => (
                <tr key={u.usuario_id} className="border-t border-white/10 align-top">
                  <td className="px-3 py-3">
                    <p className="font-medium">{u.nome ?? "Usuario sem nome"}</p>
                    <p className="text-xs text-white/50">{u.usuario_id}</p>
                  </td>
                  <td className="px-3 py-3 text-white/80">{u.email ?? "Email indisponivel"}</td>
                  <td className="px-3 py-3 font-semibold">{u.total_downloads}</td>
                  <td className="px-3 py-3 text-white/70">{formatarData(u.ultimo_download_em)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.itens.slice(0, 3).map((item) => (
                        <span key={item.download_id} className="statusBadge">
                          {labelTipo(item.item_tipo)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-2 md:hidden">
          {usuariosPagina.map((u) => (
            <article key={u.usuario_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-sm font-semibold">{u.nome ?? "Usuario sem nome"}</p>
              <p className="text-xs text-white/60">{u.email ?? "Email indisponivel"}</p>
              <p className="mt-1 text-xs text-white/60">Downloads: {u.total_downloads} | Ultimo: {formatarData(u.ultimo_download_em)}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-white/60">
          <span>
            Pagina {paginaAtualUsuarios} de {totalPaginasUsuarios} | {usuariosFiltrados.length} usuario(s)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={paginaAtualUsuarios <= 1}
              onClick={irPaginaAnterior}
              className="rounded-md border border-white/15 px-2 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={paginaAtualUsuarios >= totalPaginasUsuarios}
              onClick={irPaginaProxima}
              className="rounded-md border border-white/15 px-2 py-1 disabled:opacity-40"
            >
              Proxima
            </button>
          </div>
        </div>

        {!carregando && dados && usuariosFiltrados.length === 0 ? (
          <div className="mt-3 rounded-lg border border-white/10 bg-black/35 p-4 text-center text-sm text-white/65">
            Nenhum resultado para o filtro informado.
          </div>
        ) : null}
      </section>
    </section>
  );
}
