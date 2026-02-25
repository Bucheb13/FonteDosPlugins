import type { Metadata } from "next";
import DrumKitsClient from "../DrumKitsClient";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Drum Kits | Fonte dos Plugins",
  description: "Drum Kits para produção musical.",
  alternates: {
    canonical: "/drum-kit/drum-kit",
  },
  openGraph: {
    title: "Drum Kits | Fonte dos Plugins",
    description: "Drum Kits para produção musical.",
    url: absoluteUrl("/drum-kit/drum-kit"),
    type: "website",
  },
};

export default function Page() {
  return (
    <DrumKitsClient
      categoria="drum-kit"
      titulo="Drum Kits"
      subtituloHeader="Drum kits prontos para trap, drill, boom bap e mais."
    />
  );
}
