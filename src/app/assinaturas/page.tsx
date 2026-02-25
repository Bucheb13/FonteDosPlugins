import type { Metadata } from "next";
import Assinaturas from "./Assinaturas";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Assinaturas | FonteDosPlugins",
  description:
    "Escolha o plano ideal e tenha acesso imediato aos plugins do FonteDosPlugins com pagamento rápido via PIX.",
  alternates: {
    canonical: "/assinaturas",
  },
  openGraph: {
    title: "Assinaturas | FonteDosPlugins",
    description: "Escolha o plano ideal e tenha acesso imediato aos plugins com pagamento rápido via PIX.",
    url: absoluteUrl("/assinaturas"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Assinaturas | FonteDosPlugins",
    description: "Escolha o plano ideal e tenha acesso imediato aos plugins com pagamento rápido via PIX.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return <Assinaturas />;
}
