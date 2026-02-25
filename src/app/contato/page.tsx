"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CyberToast } from "@/components/CyberToast";
import { criarSupabaseNavegador } from "@/lib/supabase-navegador";

import "./ContatoGlow.css";

export default function PaginaContato() {
  const supabase = useMemo(() => criarSupabaseNavegador(), []);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [status, setStatus] = useState<"idle" | "enviando" | "success" | "error">("idle");

  // evita sobrescrever se o usuário já começou a editar
  const emailTocado = useRef(false);

  useEffect(() => {
    let ativo = true;

    async function preencherEmailSeLogado() {
      const { data, error } = await supabase.auth.getUser();
      if (!ativo) return;

      if (!error && data.user?.email) {
        setEmail((atual) => {
          // só preenche se estiver vazio e se o usuário não mexeu
          if (emailTocado.current) return atual;
          return atual.trim() ? atual : data.user!.email!;
        });
      }
    }

    preencherEmailSeLogado();

    return () => {
      ativo = false;
    };
  }, [supabase]);

  async function enviarFormulario(e: React.FormEvent) {
    e.preventDefault();
    setStatus("enviando");

    try {
      const res = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, mensagem }),
      });

      if (res.ok) {
        setStatus("success");
        setNome("");
        // eu NÃO limpo o email pra manter o preenchimento (melhor UX)
        setMensagem("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  function limpar() {
    setNome("");
    setEmail("");
    setMensagem("");
    emailTocado.current = false;
  }

  return (
    <main className="contatoWrap">
      <div className="contatoCard">
        <div className="contatoHeader">
          <h1 className="contatoTitle">Contato</h1>
          <p className="contatoSub">
            Entre em contato conosco. Responderemos o mais rápido possível.
          </p>
        </div>

        <form onSubmit={enviarFormulario} className="formGrid">
          <div>
            <label className="lb" htmlFor="nome">Nome</label>
            <input
              id="nome"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="infos"
              placeholder="Seu nome"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="lb" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                emailTocado.current = true;
                setEmail(e.target.value);
              }}
              className="infos"
              placeholder="seuemail@exemplo.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="lb" htmlFor="mensagem">Mensagem</label>
            <textarea
              id="mensagem"
              required
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="infos"
              placeholder="Escreva sua mensagem..."
              rows={6}
            />
          </div>

          <div className="btnRow">
            <button
              type="submit"
              className="glowBtn"
              disabled={status === "enviando"}
            >
              {status === "enviando" ? "Enviando..." : "Enviar"}
            </button>

            <button
              type="button"
              className="glowBtn glowBtnDanger"
              disabled={status === "enviando"}
              onClick={limpar}
            >
              Limpar
            </button>
          </div>
        </form>
      </div>

      {status === "success" && (
        <CyberToast
          message="Mensagem enviada com sucesso!"
          type="success"
          onClose={() => setStatus("idle")}
        />
      )}
      {status === "error" && (
        <CyberToast
          message="Erro ao enviar. Tente novamente."
          type="error"
          onClose={() => setStatus("idle")}
        />
      )}
    </main>
  );
}
