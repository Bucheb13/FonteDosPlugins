"use client";

import React from "react";
import styles from "./PureCss3D.module.css";

type CSSVars = React.CSSProperties & {
  "--z"?: string;
  "--text"?: string;
};

type Props = {
  text?: string;
  className?: string;
  layers?: number;
};

export default function PureCss3D({
  text = "Os Mais Baixados",
  className,
  layers = 20,
}: Props) {
  return (
    <div className={[styles.stage, className].filter(Boolean).join(" ")}>
      {Array.from({ length: layers }).map((_, i) => {
        const style: CSSVars = {
          "--z": `${-1.5 * i}px`,
          "--text": `"${text.replaceAll('"', '\\"')}"`,
        };
  
        return (
          <div
            key={i}
            className={styles.layer}
            style={style}
            data-text={text}
          />
        );
      })}
    </div>
  );  
}
