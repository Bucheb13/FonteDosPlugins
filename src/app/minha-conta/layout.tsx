import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Minha conta | FonteDosPlugins",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MinhaContaLayout({ children }: { children: React.ReactNode }) {
  return children;
}

