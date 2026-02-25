"use client";

import styles from "./SearchGlow.module.css";

export function SearchGlow({
  value,
  onChange,
  placeholder = "Pesquise...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className={styles.poda}>
      <div className={styles.glow} />
      <div className={styles.darkBorderBg} />
      <div className={styles.darkBorderBg} />
      <div className={styles.darkBorderBg} />
      <div className={styles.white} />
      <div className={styles.border} />

      <div className={styles.main}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
        />
        <div className={styles.inputMask} />
        <div className={styles.pinkMask} />


        <div className={styles.searchIcon} aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" height="24" fill="none">
            <circle stroke="url(#search)" r="8" cy="11" cx="11"></circle>
            <line stroke="url(#searchl)" y2="16.65" y1="22" x2="16.65" x1="22"></line>
            <defs>
              <linearGradient gradientTransform="rotate(50)" id="search">
                <stop stopColor="#f8e7f8" offset="0%"></stop>
                <stop stopColor="#b6a9b7" offset="50%"></stop>
              </linearGradient>
              <linearGradient id="searchl">
                <stop stopColor="#b6a9b7" offset="0%"></stop>
                <stop stopColor="#837484" offset="50%"></stop>
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
