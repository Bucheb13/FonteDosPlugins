import React from "react";
import styles from "./Badge.module.css";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;      // aplica na raiz
  innerClassName?: string; // (opcional) aplica no miolo (padding/texto)
};

export function Badge({ children, className, innerClassName }: BadgeProps) {
  return (
    <span className={[styles.root, className].filter(Boolean).join(" ")}>
      {/* glow externo */}
      <span className={styles.glowWrap} aria-hidden="true">
        <span className={[styles.eclipse, styles.glow].join(" ")} />
      </span>

      {/* pill principal */}
      <span className={styles.pill}>
        <span className={styles.eclipse} aria-hidden="true" />
        <span className={[styles.inner, innerClassName].filter(Boolean).join(" ")}>
          {children}
        </span>
      </span>
    </span>
  );
}
