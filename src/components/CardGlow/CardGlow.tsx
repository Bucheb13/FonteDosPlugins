"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CardGlow.module.css";

type Props = {
  badge?: string;
  badgeWords?: string[];
  badgeColors?: string[];
  className?: string;
  children?: React.ReactNode;
};

export default function CardGlow({
  badge = "",
  badgeWords,
  badgeColors = ["#fff"],
  className = "",
  children,
}: Props) {
  const words = useMemo(
    () => (badgeWords?.length ? badgeWords : badge ? [badge] : []),
    [badgeWords, badge]
  );

  const wordsRef = useRef<string[]>([]);
  const colorsRef = useRef<string[]>([]);

  const [text, setText] = useState("");
  const [color, setColor] = useState(() => badgeColors[0] ?? "#fff");
  const [underscoreHidden, setUnderscoreHidden] = useState(false);

  useEffect(() => {
    wordsRef.current = [...words];
  }, [words]);

  useEffect(() => {
    colorsRef.current = [...badgeColors];
  }, [badgeColors]);

  // efeito typing no BADGE
  useEffect(() => {
    if (!wordsRef.current.length) return;

    let letterCount = 1;
    let x = 1;
    let waiting = false;

    const tick = window.setInterval(() => {
      const currentWords = wordsRef.current;
      const currentColors = colorsRef.current;

      const w0 = currentWords[0] ?? "";
      const c0 = currentColors[0] ?? "#fff";

      setColor(c0);

      if (letterCount === 0 && waiting === false) {
        waiting = true;
        setText(w0.substring(0, letterCount));

        window.setTimeout(() => {
          if (currentColors.length) {
            const usedColor = currentColors.shift()!;
            currentColors.push(usedColor);
            setColor(currentColors[0] ?? "#fff");
          }

          const usedWord = currentWords.shift()!;
          currentWords.push(usedWord);

          x = 1;
          letterCount += x;
          waiting = false;
        }, 1000);
      } else if (letterCount === w0.length + 1 && waiting === false) {
        waiting = true;

        window.setTimeout(() => {
          x = -1;
          letterCount += x;
          waiting = false;
        }, 1000);
      } else if (waiting === false) {
        setText(w0.substring(0, letterCount));
        letterCount += x;
      }
    }, 120);

    return () => window.clearInterval(tick);
  }, []);

  // underscore blink
  useEffect(() => {
    const blink = window.setInterval(() => {
      setUnderscoreHidden((v) => !v);
    }, 400);

    return () => window.clearInterval(blink);
  }, []);

  return (
    <div className={`${styles.card} ${className}`}>
      <span className={styles.glow} aria-hidden="true" />

      <div className={styles.inner}>
        {words.length > 0 && (
          <span
            className={styles.badgeConsole}
            style={{ color }}
          >
            <span>{text}</span>
            <span
              className={`${styles.consoleUnderscore} ${
                underscoreHidden ? styles.hidden : ""
              }`}
            >
              &#95;
            </span>
          </span>
        )}

        {children ? <div className={styles.content}>{children}</div> : null}
      </div>
    </div>
  );
}
