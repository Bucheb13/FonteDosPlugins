import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Política de Privacidade | FonteDosPlugins",
  description:
    "Saiba como o FonteDosPlugins coleta, utiliza e protege suas informações pessoais. Leia nossa política de privacidade.",
  alternates: {
    canonical: "/privacidade",
  },
  openGraph: {
    title: "Política de Privacidade | FonteDosPlugins",
    description: "Saiba como o FonteDosPlugins coleta, utiliza e protege suas informações pessoais.",
    url: absoluteUrl("/privacidade"),
    type: "article",
  },
};

export default function PoliticaDePrivacidade() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-cover bg-center">
      {/* Card centralizado */}
      <div className="bg-black/20 backdrop-blur-md rounded-3xl max-w-4xl w-full px-12 py-16 text-white shadow-lg">
        <h1 className="text-4xl font-bold text-center mb-8">
          Política de Privacidade
        </h1>

        <p className="mb-6 leading-relaxed">
          Sua privacidade é importante para nós. Esta política descreve como
          coletamos, usamos e protegemos suas informações pessoais ao acessar o{" "}
          <strong>FonteDosPlugins</strong>.
        </p>

        <h2 className="text-2xl font-semibold mb-4 mt-8 text-gray-200">
          1. Informações coletadas
        </h2>
        <p className="mb-4 leading-relaxed">
          Podemos coletar informações como e-mail, nome e dados de uso do site
          para melhorar nossos serviços e a experiência do usuário.
        </p>

        <h2 className="text-2xl font-semibold mb-4 mt-8 text-gray-200">
          2. Uso das informações
        </h2>
        <p className="mb-4 leading-relaxed">
          Seus dados são usados apenas para fornecer suporte, enviar notificações
          sobre plugins e melhorar sua experiência no site.
        </p>

        <h2 className="text-2xl font-semibold mb-4 mt-8 text-gray-200">
          3. Compartilhamento de dados
        </h2>
        <p className="mb-4 leading-relaxed">
          Não compartilhamos suas informações pessoais com terceiros, exceto
          quando exigido por lei ou por solicitações válidas de DMCA.
        </p>

        <h2 className="text-2xl font-semibold mb-4 mt-8 text-gray-200">
          4. Segurança
        </h2>
        <p className="mb-4 leading-relaxed">
          Implementamos medidas de segurança para proteger suas informações
          contra acesso não autorizado, divulgação ou perda.
        </p>

        <h2 className="text-2xl font-semibold mb-4 mt-8 text-gray-200">
          5. Alterações
        </h2>
        <p className="mb-4 leading-relaxed">
          Podemos atualizar esta política a qualquer momento. Recomendamos que
          consulte esta página regularmente.
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
