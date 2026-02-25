"use client";

import React, { useEffect, useLayoutEffect, useRef } from "react";
import styles from "./PillTabs.module.css";

type TabKey = string;

type TabItem<T extends TabKey> = {
  key: T;
  label: React.ReactNode;
};

type Props<T extends TabKey> = {
  name: string;
  abaAtiva: T;
  setAbaAtiva: (v: T) => void;
  tabs: TabItem<T>[];
  className?: string;
};

export default function PillTabs<T extends TabKey>({
  name,
  abaAtiva,
  setAbaAtiva,
  tabs,
  className,
}: Props<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const tabRefs = useRef<Record<T, HTMLLabelElement | null>>(
    {} as Record<T, HTMLLabelElement | null>
  );
  const indicatorRef = useRef<HTMLDivElement | null>(null);

  const atualizar = () => {
    const indicator = indicatorRef.current;
    const activeLabel = tabRefs.current[abaAtiva];
    const container = containerRef.current;
    if (!indicator || !activeLabel || !container) return;

    const ajuste = 35; // igual ao seu

    // posição do label relativa ao container (melhor que offsetLeft em layouts complexos)
    const cRect = container.getBoundingClientRect();
    const lRect = activeLabel.getBoundingClientRect();

    const left = lRect.left - cRect.left;
    const w = lRect.width;

    indicator.style.width = `${Math.max(0, w - ajuste)}px`;
    indicator.style.transform = `translateX(${left + ajuste / 2}px)`;
    indicator.style.opacity = "1";
  };

  useLayoutEffect(() => {
    requestAnimationFrame(atualizar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaAtiva, tabs.length]);

  useEffect(() => {
    const onResize = () => atualizar();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaAtiva]);

  return (
    <div
      ref={containerRef}
      className={`${styles.pillTabs} opacity-75 mx-auto ${className ?? ""}`}
    >
      {tabs.map((t) => {
        const id = `pill-${name}-${t.key}`;
        return (
          <React.Fragment key={t.key}>
            <input
              type="radio"
              name={name}
              id={id}
              checked={abaAtiva === t.key}
              onChange={() => setAbaAtiva(t.key)}
            />
            <label
              htmlFor={id}
              ref={(el) => {
                tabRefs.current[t.key] = el; // sem return
              }}
            >
              {t.label}
            </label>
          </React.Fragment>
        );
      })}

      <div ref={indicatorRef} className={styles.pillIndicator} />
    </div>
  );
}
