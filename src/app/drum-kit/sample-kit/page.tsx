import type { Metadata } from "next";
import DrumKitsClient from "../DrumKitsClient";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Sample Kits | Fonte dos Plugins",
  description: "Sample Kits para produção musical.",
  alternates: {
    canonical: "/drum-kit/sample-kit",
  },
  openGraph: {
    title: "Sample Kits | Fonte dos Plugins",
    description: "Sample Kits para produção musical.",
    url: absoluteUrl("/drum-kit/sample-kit"),
    type: "website",
  },
};

export default function Page() {
  return (
    <DrumKitsClient
      categoria="sample-kit"
      titulo="Sample Kits"
      subtituloHeader="Samples e one-shots para elevar suas produções."
    />
  );
}
