"use client";
import styles from "./CyberCard.module.css";

type Props = {
  className?: string;
};

export default function CyberCard({ className }: Props) {
  return (
    <div className={`${styles.wrap} ${className ?? ""}`} aria-hidden="true">
      <div className={styles.card}>
        <b />
        <div className={styles.content}>
          <div className={styles.title}>
          </div>
        </div>
      </div>
    </div>
  );
}
