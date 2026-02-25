import { NextResponse } from "next/server";
import { autorizarAdminOuErro } from "@/lib/admin-auth";
import { registrarAuditoriaAdmin } from "@/lib/admin-auditoria";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

type Categoria = "efeitos" | "instrumentais";
type TipoInstalacao = "video" | "texto" | null;

function jsonErro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function parseTipoInstalacao(
  raw: unknown
): { ok: true; value: TipoInstalacao } | { ok: false } {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return { ok: true, value: null };
  if (v === "video" || v === "texto") return { ok: true, value: v };
  return { ok: false };
}

function criarClienteR2() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 não configurado.");
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function extDaImagem(file: File): string | null {
  const ct = file.type.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  return null;
}

function validarCategoria(raw: string): Categoria | null {
  const v = raw.trim().toLowerCase();
  if (v === "efeitos" || v === "instrumentais") return v;
  return null;
}

export async function POST(req: Request) {
  /* ======================
     AUTH ADMIN
  ====================== */
  const negado = await autorizarAdminOuErro(req);
  if (negado) return negado;

  await registrarAuditoriaAdmin(req, { acao: "POST", entidade: "plugins/criar" });

  const form = await req.formData();

  /* ======================
     CAMPOS
  ====================== */
  const nome = String(form.get("nome") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim();
  const subtitulo = String(form.get("subtitulo") ?? "").trim() || null;
  const descricao = String(form.get("descricao") ?? "").trim() || null;

  if (!nome || !slug) return jsonErro("Nome e slug são obrigatórios.");

  // ✅ categoria obrigatória
  const categoriaRaw = String(form.get("categoria") ?? "");
  const categoria = validarCategoria(categoriaRaw);
  if (!categoria) return jsonErro("Categoria inválida (use: efeitos | instrumentais).");

  // ✅ instalação opcional
  const tipoParsed = parseTipoInstalacao(form.get("tipo_instalacao"));
  if (!tipoParsed.ok) {
    return jsonErro("Tipo de instalação inválido (use: video | texto).");
  }

  let tipoInstalacao: TipoInstalacao = tipoParsed.value;

  const conteudoInstalacaoTrim = String(form.get("conteudo_instalacao") ?? "").trim();
  const conteudoInstalacao: string | null =
    conteudoInstalacaoTrim.length > 0 ? conteudoInstalacaoTrim : null;

  // coerência: se tem tipo mas não tem conteúdo -> zera tipo
  if (tipoInstalacao && !conteudoInstalacao) {
    tipoInstalacao = null;
  }

  // se tem conteúdo mas não tem tipo -> erro (mantém o banco limpo)
  if (conteudoInstalacao && !tipoInstalacao) {
    return jsonErro("Informe o tipo de instalação (video | texto) quando houver conteúdo.");
  }

  const ativo = String(form.get("ativo") ?? "true") === "true";

  const capa = form.get("capa");
  const torrent = form.get("torrent");

  if (!(capa instanceof File)) return jsonErro("Capa obrigatória.");
  if (!(torrent instanceof File)) return jsonErro("Torrent obrigatório.");

  if (!torrent.name.endsWith(".torrent")) {
    return jsonErro("Arquivo torrent inválido.");
  }

  const ext = extDaImagem(capa);
  if (!ext) return jsonErro("Formato de imagem inválido.");

  const supabase = criarSupabaseAdmin();

  /* ======================
     VALIDAR SLUG ANTES
  ====================== */
  const { data: existente } = await supabase
    .from("plugins")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existente) {
    return jsonErro("Já existe um plugin com esse slug.");
  }

  /* ======================
     UPLOAD R2
  ====================== */
  const bucket = process.env.R2_BUCKET!;
  const r2 = criarClienteR2();

  const chaveCapa = `plugins/capas/${slug}.${ext}`;
  const chaveTorrent = `plugins/torrents/${slug}.torrent`;

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: chaveCapa,
      Body: Buffer.from(await capa.arrayBuffer()),
      ContentType: capa.type,
    })
  );

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: chaveTorrent,
      Body: Buffer.from(await torrent.arrayBuffer()),
      ContentType: "application/x-bittorrent",
    })
  );

  /* ======================
     INSERT SUPABASE
  ====================== */
  const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL!.replace(/\/$/, "");

  const { data, error } = await supabase
    .from("plugins")
    .insert({
      slug,
      nome,
      subtitulo,
      descricao,
      tipo_instalacao: tipoInstalacao,         // ✅ pode ser null
      conteudo_instalacao: conteudoInstalacao, // ✅ pode ser null
      ativo,
      categoria,
      imagem_capa_url: `${publicBase}/${chaveCapa}`,
      r2_chave_arquivo: chaveTorrent,
    })
    .select()
    .single();

  if (error) {
    console.error("Erro Supabase:", error);
    if (error.code === "23505") return jsonErro("Slug já está em uso.");
    return jsonErro("Erro ao criar o plugin.");
  }

  return NextResponse.json({ ok: true, plugin: data });
}
