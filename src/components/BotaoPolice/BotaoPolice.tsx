"use client";

import React, { useId } from "react";
import styles from "./BotaoPolice.module.css";

type Props = {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
};

export default function BotaoPolice({
  onClick,
  children,
  className,
  disabled,
  type = "button",
  ariaLabel,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const f1 = `unopaq-${uid}`;
  const f2 = `unopaq2-${uid}`;
  const f3 = `unopaq3-${uid}`;

  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      {/* filtros precisam existir no DOM */}
      <svg className={styles.svg0} aria-hidden="true">
        <filter width="300%" x="-100%" height="300%" y="-100%" id={f1}>
          <feColorMatrix
            values="1 0 0 0 0 
                    0 1 0 0 0 
                    0 0 1 0 0 
                    0 0 0 9 0"
          />
        </filter>

        <filter width="300%" x="-100%" height="300%" y="-100%" id={f2}>
          <feColorMatrix
            values="1 0 0 0 0 
                    0 1 0 0 0 
                    0 0 1 0 0 
                    0 0 0 3 0"
          />
        </filter>

        <filter width="300%" x="-100%" height="300%" y="-100%" id={f3}>
          <feColorMatrix
            values="1 0 0 0.2 0 
                    0 1 0 0.2 0 
                    0 0 1 0.2 0 
                    0 0 0 2 0"
          />
        </filter>
      </svg>

      {/* botão real (click/hover/active controlam os layers via CSS) */}
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={styles.realButton}
      />

      {/* estrutura exatamente como seu exemplo */}

      <div className={styles.buttonContainer}>
        <div className={`${styles.spin} ${styles.spinBlur}`} style={{ filter: `blur(2em) url(#${f1})` }} />
        <div className={`${styles.spin} ${styles.spinIntense}`} style={{ filter: `blur(0.25em) url(#${f2})` }} />
        <div className={styles.backdrop} />
        <div className={styles.buttonBorder}>
          <div className={`${styles.spin} ${styles.spinInside}`} style={{ filter: `blur(2px) url(#${f3})` }} />
          <div className={styles.button}>{children}</div>
        </div>
      </div>
    </div>
  );
}
