import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Contato | FonteDosPlugins",
  description: "Fale com a equipe da FonteDosPlugins para suporte, dúvidas e parcerias.",
  alternates: {
    canonical: "/contato",
  },
  openGraph: {
    title: "Contato | FonteDosPlugins",
    description: "Fale com a equipe da FonteDosPlugins para suporte, dúvidas e parcerias.",
    url: absoluteUrl("/contato"),
    type: "website",
  },
};

export default function ContatoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

