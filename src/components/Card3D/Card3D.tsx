"use client";

import Link from "next/link";
import "./Card3D.css";

type Props = {
  titulo: string;
  imagemUrl: string | null;
  href: string;
};

export default function Card3D({ titulo, imagemUrl, href }: Props) {
  return (
    <div className="cards">
      <Link href={href}>
        <figure className="card">
          <div
            className="card_image"
            style={{
              backgroundImage: imagemUrl
                ? `url('${imagemUrl}')`
                : "linear-gradient(135deg,#111827,#020617)",
            }}
          />

          <div className="card_overlay" />

          <figcaption className="card_title">
            {titulo}
          </figcaption>
        </figure>
      </Link>
    </div>
  );
}
