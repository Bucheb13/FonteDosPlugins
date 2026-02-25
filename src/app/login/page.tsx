"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { criarSupabaseNavegador } from "@/lib/supabase-navegador";
import { CyberToast } from "@/components/CyberToast";
import ModalStageFX from "@/components/ModalStageFX";

import "./LoginCard.css";

function normalizarNomeUsuario(nome: string) {
  return nome.trim().replace(/\s+/g, " ");
}

async function inativarAssinaturaSeExpirada(
  supabase: ReturnType<typeof criarSupabaseNavegador>,
  usuarioId: string
) {
  const { data: assinatura } = await supabase
    .from("assinaturas")
    .select("*")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (assinatura?.periodo_fim && new Date(assinatura.periodo_fim) < new Date()) {
    await supabase
      .from("assinaturas")
      .update({ status: "inativa", tipo: null, periodo_fim: null })
      .eq("usuario_id", usuarioId);
  }
}

type Modo = "entrar" | "criar";
type ToastType = "success" | "error" | "info";

export default function PaginaLogin() {
  const supabase = useMemo(() => criarSupabaseNavegador(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const retorno = searchParams.get("redirect") || searchParams.get("retorno") || "/";

  const [modo, setModo] = useState<Modo>("entrar");
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  function showToast(message: string, type: ToastType = "info") {
    setToast({ message, type });
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error || !data.user) {
        setCarregando(false);
        showToast(
          "Não foi possível entrar. Verifique seus dados ou confirme seu e-mail.",
          "error"
        );
        return;
      }

      await inativarAssinaturaSeExpirada(supabase, data.user.id);
      router.replace(retorno);
    } catch {
      setCarregando(false);
      showToast("Erro inesperado ao tentar entrar.", "error");
    }
  }

  async function criarConta(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);

    const nome = normalizarNomeUsuario(nomeUsuario);

    if (nome.length < 2) {
      setCarregando(false);
      showToast("Informe um nome válido.", "error");
      return;
    }

    if (senha.length < 6) {
      setCarregando(false);
      showToast("Senha deve ter no mínimo 6 caracteres.", "error");
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: { display_name: nome },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      setCarregando(false);

      if (error) {
        showToast("Erro ao tentar criar conta.", "error");
        return;
      }

      showToast("Cadastro realizado! Verifique seu e-mail para confirmar seu cadastro.", "info");
    } catch {
      setCarregando(false);
      showToast("Erro inesperado ao criar conta.", "error");
    }
  }

  async function redefinirSenha() {
    if (!email) {
      showToast("Informe seu e-mail para redefinir a senha.", "info");
      return;
    }

    setCarregando(true);

    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      setCarregando(false);
      showToast("Se este e-mail estiver cadastrado, enviaremos um link.", "info");
    } catch {
      setCarregando(false);
      showToast("Erro ao enviar e-mail de redefinição.", "error");
    }
  }

  const textoPrimario =
    carregando ? "Processando..." : modo === "entrar" ? "Entrar" : "Criar conta";

  const textoSecundario = modo === "entrar" ? "Criar conta" : "Já tenho conta";

  return (
    <main className="loginWrap">
      <div className="absolute inset-0 modal-stage-vignette pointer-events-none" />
      <ModalStageFX intensity={0.72} />
      <div className="bgNoise" />

      <div className="cardOuter">
        <div className="cardInner">
          <form
            className="formCard"
            onSubmit={modo === "entrar" ? entrar : criarConta}
          >
            <div className="blobCyan" />
            <div className="blobPink" />

            <div className="heading">FonteDosPlugins</div>
            <div className="subheading">
              {modo === "entrar" ? "Acesse sua conta" : "Crie sua conta em segundos"}
            </div>

            <div className="tabs">
              <button
                type="button"
                className={`tabBtn ${modo === "entrar" ? "tabBtnActive" : ""}`}
                onClick={() => setModo("entrar")}
                disabled={carregando}
              >
                Entrar
              </button>
              <button
                type="button"
                className={`tabBtn ${modo === "criar" ? "tabBtnActive" : ""}`}
                onClick={() => setModo("criar")}
                disabled={carregando}
              >
                Criar conta
              </button>
            </div>

            {modo === "criar" && (
              <div className="field">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="inputIcon">
                  <path
                    fill="currentColor"
                    d="M8 8a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 1c-2.67 0-5 1.34-5 3v1h10v-1c0-1.66-2.33-3-5-3Z"
                  />
                </svg>

                <input
                  value={nomeUsuario}
                  onChange={(e) => setNomeUsuario(e.target.value)}
                  className="inputField"
                  placeholder="Nome de usuário"
                  autoComplete="username"
                />
              </div>
            )}

            <div className="field">
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="inputIcon">
                <path
                  fill="currentColor"
                  d="M13.5 4h-11A1.5 1.5 0 0 0 1 5.5v5A1.5 1.5 0 0 0 2.5 12h11A1.5 1.5 0 0 0 15 10.5v-5A1.5 1.5 0 0 0 13.5 4Zm-.45 2.2L8.6 8.93a1 1 0 0 1-1.2 0L2.95 6.2a.5.5 0 1 1 .6-.8L8 8.3l4.45-2.9a.5.5 0 1 1 .6.8Z"
                />
              </svg>

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="inputField"
                placeholder="Email"
                autoComplete="email"
              />
            </div>

            <div className="field">
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="inputIcon">
                <path
                  fill="currentColor"
                  d="M8 1a2 2 0 0 1 2 2v3H6V3a2 2 0 0 1 2-2Zm3 6V6a3 3 0 0 0-6 0v1a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"
                />
              </svg>

              <input
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                type="password"
                required
                className="inputField"
                placeholder="Senha"
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              />
            </div>

            <div className="actionsRow">
              <button type="submit" className="primaryBtn" disabled={carregando}>
                {textoPrimario}
              </button>

              <button
                type="button"
                className="secondaryBtn"
                disabled={carregando}
                onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
              >
                {textoSecundario}
              </button>
            </div>

            {modo === "entrar" && (
              <button
                type="button"
                className="linkBtn"
                onClick={redefinirSenha}
                disabled={carregando}
              >
                Esqueci minha senha
              </button>
            )}

            <div className="brandLine">
              FonteDosPlugins • {modo === "entrar" ? "Login" : "Cadastro"}
            </div>
          </form>
        </div>
      </div>

      {toast && (
        <CyberToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}
