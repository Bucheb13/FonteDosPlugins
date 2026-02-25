import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Termos de Uso | FonteDosPlugins",
  description:
    "Leia os Termos de Uso do FonteDosPlugins. Entenda as regras, responsabilidades, direitos autorais e políticas de uso do site.",
  alternates: {
    canonical: "/termos-de-uso",
  },
  openGraph: {
    title: "Termos de Uso | FonteDosPlugins",
    description: "Entenda as regras, responsabilidades, direitos autorais e políticas de uso do site.",
    url: absoluteUrl("/termos-de-uso"),
    type: "article",
  },
};

export default function TermosDeUso() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-cover bg-center">
      {/* Card centralizado */}
      <div className="bg-black/20 backdrop-blur-md rounded-3xl max-w-4xl w-full px-12 py-16 text-white shadow-lg">
        <h1 className="text-4xl font-bold text-center mb-8">
          Termos de Uso
        </h1>

        <p className="mb-6 leading-relaxed">
          Bem-vindo ao <strong>FonteDosPlugins</strong>! Este site disponibiliza plugins de terceiros que podem
          estar modificados ou sem licença oficial. Ao acessar e utilizar nosso site, você reconhece que o uso
          é por sua conta e risco, devendo respeitar a legislação vigente.
        </p>

        <p className="mb-6 leading-relaxed">
          Todos os plugins disponíveis no <strong>FonteDosPlugins</strong> são verificados e considerados
          seguros, livres de vírus ou malwares conhecidos. Não garantimos compatibilidade com todos os sistemas.
        </p>

        <h2 className="text-2xl mb-4 mt-8 text-gray-200">
          1. Uso do site
        </h2>
        <p className="mb-4 leading-relaxed">
          O usuário concorda em utilizar o site apenas para fins legais e pessoais. É proibido distribuir,
          comercializar ou reivindicar a autoria dos plugins disponibilizados.
        </p>

        <h2 className="text-2xl mb-4 mt-8 text-gray-200">
          2. Propriedade intelectual
        </h2>
        <p className="mb-4 leading-relaxed">
          Todos os plugins e materiais são propriedade de seus desenvolvedores originais. O FonteDosPlugins
          atua apenas como repositório de acesso.
        </p>

        <h2 className="text-2xl mb-4 mt-8 text-gray-200">
          3. Responsabilidade
        </h2>
        <p className="mb-4 leading-relaxed">
          O FonteDosPlugins não se responsabiliza por qualquer problema técnico, legal ou financeiro decorrente
          do uso dos plugins.
        </p>

        <h2 className="text-2xl mb-4 mt-8 text-gray-200">
          4. Alterações
        </h2>
        <p className="mb-4 leading-relaxed">
          Estes termos podem ser alterados a qualquer momento, sem aviso prévio.
        </p>

        <h2 className="text-2xl mb-4 mt-8 text-gray-200">
          5. DMCA e Direitos Autorais
        </h2>
        <p className="mb-4 leading-relaxed">
          Caso algum conteúdo viole direitos autorais, envie uma solicitação para{" "}
          <a
            href="mailto:suporte@fontedosplugins.com.br"
            className="text-blue-400 hover:underline"
          >
            suporte@fontedosplugins.com.br
          </a>.
        </p>

        {/* Botão voltar */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 border border-white/40 rounded-full text-white hover:bg-white/10 transition"
          >
            Voltar à Home
          </Link>
        </div>
      </div>
    </main>
  );
}
