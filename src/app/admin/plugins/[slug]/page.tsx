"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAdmin } from "@/components/admin/admin-contexto";

type TipoInstalacao = "video" | "texto" | null;

type Categoria = "efeitos" | "instrumentais";

type Plugin = {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string | null;
  descricao: string | null;
  tipo_instalacao: TipoInstalacao;
  conteudo_instalacao: string | null;
  imagem_capa_url: string | null;
  r2_chave_arquivo: string | null;
  ativo: boolean | null; // pode vir null do banco
  criado_em: string;

  // ✅ NOVO
  categoria: Categoria | null;
};

async function lerJsonComSeguranca(res: Response) {
  const texto = await res.text();
  try {
    return texto ? JSON.parse(texto) : {};
  } catch {
    return { erro: texto || "Resposta inválida do servidor" };
  }
}

function isYoutubeUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be");
  } catch {
    return false;
  }
}

function normalizarCategoria(v: unknown): Categoria {
  return v === "instrumentais" ? "instrumentais" : "efeitos";
}

export default function PaginaAdminEditarPlugin() {
  const { senhaAdmin, setMensagem } = useAdmin();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [adminOk, setAdminOk] = useState(false);
  const [validando, setValidando] = useState(false);

  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [carregando, setCarregando] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [enviandoArquivos, setEnviandoArquivos] = useState(false);

  // campos editáveis
  const [nome, setNome] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [ativo, setAtivo] = useState<boolean>(true);
  const [descricao, setDescricao] = useState("");
  const [tipoInstalacao, setTipoInstalacao] = useState<TipoInstalacao>(null);
  const [conteudoInstalacao, setConteudoInstalacao] = useState("");

  // ✅ NOVO: categoria
  const [categoria, setCategoria] = useState<Categoria>("efeitos");

  // arquivos
  const [capaNova, setCapaNova] = useState<File | null>(null);
  const [torrentNovo, setTorrentNovo] = useState<File | null>(null);

  const inputCapaRef = useRef<HTMLInputElement | null>(null);
  const inputTorrentRef = useRef<HTMLInputElement | null>(null);

  // valida senha admin
  const validarSenha = useCallback(async () => {
    setMensagem(null);

    if (!senhaAdmin) {
      setAdminOk(false);
      return;
    }

    setValidando(true);

    try {
      const res = await fetch("/api/admin/validar", {
        headers: { "x-senha-admin": senhaAdmin },
        cache: "no-store",
      });

      setValidando(false);

      if (!res.ok) {
        setAdminOk(false);
        setMensagem("Senha admin inválida.");
        return;
      }

      setAdminOk(true);
    } catch {
      setValidando(false);
      setAdminOk(false);
      setMensagem("Falha ao validar a senha.");
    }
  }, [senhaAdmin, setMensagem]);

  // carregar plugin
  const carregar = useCallback(async () => {
    setMensagem(null);

    if (!adminOk) {
      setMensagem("Digite a senha correta do admin.");
      return;
    }

    setCarregando(true);

    const res = await fetch(
      `/api/admin/plugins/obter?slug=${encodeURIComponent(slug)}`,
      {
        headers: { "x-senha-admin": senhaAdmin },
        cache: "no-store",
      }
    );

    const json = await lerJsonComSeguranca(res);
    setCarregando(false);

    if (!res.ok) {
      setMensagem(json?.erro ?? "Falha ao carregar plugin.");
      return;
    }

    const p = (json.plugin ?? null) as Plugin | null;
    setPlugin(p);

    if (p) {
      setNome(p.nome ?? "");
      setSubtitulo(p.subtitulo ?? "");
      setDescricao(p.descricao ?? "");
      setTipoInstalacao(p.tipo_instalacao ?? null);
      setConteudoInstalacao(p.conteudo_instalacao ?? "");      
      setAtivo(p.ativo ?? true);

      // ✅ NOVO
      setCategoria(normalizarCategoria(p.categoria));
    }
  }, [adminOk, senhaAdmin, setMensagem, slug]);

  useEffect(() => {
    const t = setTimeout(() => void validarSenha(), 0);
    return () => clearTimeout(t);
  }, [validarSenha]);

  useEffect(() => {
    if (!adminOk) return;
    const t = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(t);
  }, [adminOk, carregar]);

  // salvar plugin
  const salvar = useCallback(async () => {
    setMensagem(null);

    if (!adminOk) return setMensagem("Digite a senha correta do admin.");

    const nomeOk = nome.trim();
    if (!nomeOk) return setMensagem("Nome é obrigatório.");

    const conteudoOk = conteudoInstalacao.trim();

    if (tipoInstalacao === "video" && conteudoOk && !isYoutubeUrl(conteudoOk)) {
      return setMensagem("Informe uma URL válida do YouTube.");
    }
    

    setSalvando(true);

    const res = await fetch("/api/admin/plugins/editar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-senha-admin": senhaAdmin,
      },
      body: JSON.stringify({
        slug,
        nome: nomeOk,
        subtitulo: subtitulo.trim() || null,
        descricao: descricao.trim() || null,
        

        tipo_instalacao: conteudoOk ? tipoInstalacao : null,
        conteudo_instalacao: conteudoOk || null,
        
        ativo,

        // ✅ NOVO
        categoria,
      }),
    }).catch(() => null);

    if (!res) {
      setSalvando(false);
      return setMensagem("Falha de rede ao salvar.");
    }

    const json = await lerJsonComSeguranca(res);
    setSalvando(false);

    if (!res.ok) {
      return setMensagem(json?.erro ?? `Falha ao salvar (HTTP ${res.status}).`);
    }

    const p = (json.plugin ?? null) as Plugin | null;
    if (p) {
      setPlugin(p);
      setNome(p.nome ?? "");
      setSubtitulo(p.subtitulo ?? "");
      setDescricao(p.descricao ?? "");
      setTipoInstalacao(p.tipo_instalacao ?? "video");
      setConteudoInstalacao(p.conteudo_instalacao ?? "");

      // ✅ NOVO
      setCategoria(normalizarCategoria(p.categoria));
    }

    setMensagem("Salvo com sucesso.");
  }, [
    adminOk,
    senhaAdmin,
    setMensagem,
    slug,
    nome,
    subtitulo,
    descricao,
    tipoInstalacao,
    conteudoInstalacao,
    ativo,
    categoria,
  ]);

  // enviar arquivos
  const enviarArquivos = useCallback(async () => {
    setMensagem(null);

    if (!adminOk) return setMensagem("Digite a senha correta do admin.");
    if (!capaNova && !torrentNovo) return setMensagem("Selecione uma capa e/ou um .torrent.");

    setEnviandoArquivos(true);

    const fd = new FormData();
    fd.append("slug", slug);
    if (capaNova) fd.append("capa", capaNova);
    if (torrentNovo) fd.append("torrent", torrentNovo);

    const res = await fetch("/api/admin/plugins/editar-arquivos", {
      method: "POST",
      headers: { "x-senha-admin": senhaAdmin },
      body: fd,
    }).catch(() => null);

    if (!res) {
      setEnviandoArquivos(false);
      return setMensagem("Falha de rede ao enviar arquivos.");
    }

    const json = await lerJsonComSeguranca(res);
    setEnviandoArquivos(false);

    if (!res.ok) {
      return setMensagem(json?.erro ?? `Falha ao enviar (HTTP ${res.status}).`);
    }

    const p = (json.plugin ?? null) as Plugin | null;
    if (p) {
      setPlugin(p);
      setNome(p.nome ?? "");
      setSubtitulo(p.subtitulo ?? "");
    }

    setCapaNova(null);
    setTorrentNovo(null);
    setMensagem("Arquivos atualizados com sucesso.");
  }, [adminOk, senhaAdmin, setMensagem, slug, capaNova, torrentNovo]);

  // render
  if (!senhaAdmin)
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 text-sm text-white/70">
        Digite a senha do admin no header para editar este plugin.
      </div>
    );
  if (validando)
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 text-sm text-white/70">
        Validando senha…
      </div>
    );
  if (!adminOk)
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 text-sm text-white/70">
        Senha admin inválida.
      </div>
    );
  if (carregando || !plugin)
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 text-sm text-white/70">
        {carregando ? "Carregando…" : "Plugin não encontrado."}
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      {/* DADOS */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Editar plugin</h2>
            <p className="mt-1 text-sm text-white/70">
              slug: <span className="text-white/80">{plugin.slug}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void carregar()}
              disabled={salvando || carregando || enviandoArquivos}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs hover:bg-black/40 disabled:opacity-60"
            >
              Recarregar
            </button>

            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando || enviandoArquivos}
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-xs text-white/60">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
            />
          </div>

          {/* ✅ NOVO: CATEGORIA */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-xs text-white/60">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as Categoria)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
            >
              <option value="efeitos">Efeitos</option>
              <option value="instrumentais">Instrumentais</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-xs text-white/60">Subtitulo</label>
            <textarea
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              rows={5}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
            />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-xs text-white/60">Descrição completa</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={6}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
              placeholder="Descrição detalhada do plugin…"
            />
          </div>

          {/* TIPO DE CONTEÚDO */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-xs text-white/60">Tipo de conteúdo de instalação</label>
            <select
              value={tipoInstalacao ?? ""}
              onChange={(e) => {
                const v = e.target.value as ("" | "video" | "texto");
                setTipoInstalacao(v === "" ? null : v);
                setConteudoInstalacao("");
              }}
              
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
            >
              <option value="">Sem instalação</option>
              <option value="video">Vídeo (YouTube)</option>
              <option value="texto">Texto / Instruções</option>
            </select>
          </div>

          {/* CONTEÚDO DINÂMICO */}
          {tipoInstalacao === "video" && (
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs text-white/60">Link do vídeo (YouTube)</label>
              <input
                value={conteudoInstalacao}
                onChange={(e) => setConteudoInstalacao(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
              />
            </div>
          )}

          {tipoInstalacao === "texto" && (
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs text-white/60">Texto de instalação</label>
              <textarea
                value={conteudoInstalacao}
                onChange={(e) => setConteudoInstalacao(e.target.value)}
                rows={6}
                placeholder="Explique como instalar o plugin..."
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
              />
            </div>
          )}

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm md:col-span-2">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span className="text-white/80">Ativo</span>
          </label>
        </div>
      </section>

      {/* ARQUIVOS */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
        <h3 className="text-lg font-semibold">Arquivos (R2)</h3>
        <p className="mt-1 text-sm text-white/60">
          Atualize a capa e/ou o .torrent deste plugin (1600×900).
        </p>

        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-white/70 text-xs">Capa atual</div>
            {plugin.imagem_capa_url ? (
              <div className="mt-3 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plugin.imagem_capa_url}
                  alt={plugin.nome}
                  className="h-20 w-20 rounded-xl object-cover border border-white/10"
                />
                <div className="text-xs text-white/60 break-all">
                  {plugin.imagem_capa_url}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-white/70">Sem capa</div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-white/70 text-xs">Torrent atual</div>
            <div className="mt-2 text-white/70">
              {plugin.r2_chave_arquivo ? plugin.r2_chave_arquivo : "Sem torrent"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* CAPA */}
          <div>
            <div className="text-xs text-white/60 mb-2">Nova capa</div>

            <input
              ref={inputCapaRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setCapaNova(file);
                e.currentTarget.value = "";
              }}
            />

            <button
              type="button"
              onClick={() => inputCapaRef.current?.click()}
              disabled={enviandoArquivos}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-left disabled:opacity-60"
            >
              {capaNova ? `✅ ${capaNova.name}` : "Selecionar imagem…"}
            </button>
          </div>

          {/* TORRENT */}
          <div>
            <div className="text-xs text-white/60 mb-2">Novo .torrent</div>

            <input
              ref={inputTorrentRef}
              type="file"
              accept=".torrent,application/x-bittorrent"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setTorrentNovo(file);
                e.currentTarget.value = "";
              }}
            />

            <button
              type="button"
              onClick={() => inputTorrentRef.current?.click()}
              disabled={enviandoArquivos}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-left disabled:opacity-60"
            >
              {torrentNovo ? `✅ ${torrentNovo.name}` : "Selecionar .torrent…"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => void enviarArquivos()}
            disabled={enviandoArquivos || (!capaNova && !torrentNovo)}
            className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black disabled:opacity-60"
          >
            {enviandoArquivos ? "Enviando…" : "Enviar arquivos"}
          </button>
        </div>
      </section>
    </div>
  );
}
