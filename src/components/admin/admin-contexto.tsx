"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type AcaoHeader = {
  rotulo: string;
  carregando: boolean;
  aoClicar: () => void | Promise<void>;
} | null;

type AdminContextoValor = {
  senhaAdmin: string;
  setSenhaAdmin: (v: string) => void;
  adminPorSessao: boolean;
  verificandoAcesso: boolean;

  mensagem: string | null;
  setMensagem: (v: string | null) => void;

  acaoHeader: AcaoHeader;
  setAcaoHeader: (a: AcaoHeader) => void;
};

const AdminContexto = createContext<AdminContextoValor | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [adminPorSessao, setAdminPorSessao] = useState(false);
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [acaoHeader, setAcaoHeader] = useState<AcaoHeader>(null);

  useEffect(() => {
    let ativo = true;

    async function validarSessaoAdmin() {
      try {
        const res = await fetch("/api/admin/validar", { cache: "no-store" });
        if (!ativo) return;

        if (res.ok) {
          setAdminPorSessao(true);
          setSenhaAdmin((atual) => atual || "__session_admin__");
        } else {
          setAdminPorSessao(false);
        }
      } finally {
        if (ativo) setVerificandoAcesso(false);
      }
    }

    void validarSessaoAdmin();
    return () => {
      ativo = false;
    };
  }, []);

  const valor = useMemo(
    () => ({
      senhaAdmin,
      setSenhaAdmin,
      adminPorSessao,
      verificandoAcesso,
      mensagem,
      setMensagem,
      acaoHeader,
      setAcaoHeader,
    }),
    [senhaAdmin, adminPorSessao, verificandoAcesso, mensagem, acaoHeader]
  );

  return <AdminContexto.Provider value={valor}>{children}</AdminContexto.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContexto);
  if (!ctx) throw new Error("useAdmin precisa estar dentro de <AdminProvider />");
  return ctx;
}
