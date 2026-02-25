import type { Metadata } from "next";
import DrumKitsClient from "../DrumKitsClient";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "MIDI Kits | Fonte dos Plugins",
  description: "MIDI Kits para produção musical.",
  alternates: {
    canonical: "/drum-kit/midi-kit",
  },
  openGraph: {
    title: "MIDI Kits | Fonte dos Plugins",
    description: "MIDI Kits para produção musical.",
    url: absoluteUrl("/drum-kit/midi-kit"),
    type: "website",
  },
};

export default function Page() {
  return (
    <DrumKitsClient
      categoria="midi-kit"
      titulo="MIDI Kits"
      subtituloHeader="Progressões, melodias e MIDIs prontos."
    />
  );
}
