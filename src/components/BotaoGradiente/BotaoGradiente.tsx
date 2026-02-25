"use client";

import Link from "next/link";
import styles from "./BotaoGradiente.module.css";

type Props = {
  children: React.ReactNode;
  href?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function BotaoGradiente({
  children,
  href,
  className = "",
  ...props
}: Props) {
  const classes = `${styles.botao} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
