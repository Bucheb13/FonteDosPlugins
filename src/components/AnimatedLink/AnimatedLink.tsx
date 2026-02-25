"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AnimatedLink.module.css";

type Props = {
  href: string;
  text: string;
  className?: string;

  /** se true, /plugins/abc deixa ativo /plugins */
  startsWith?: boolean;
};

function normalize(path: string) {
  // remove query/hash e trailing slash
  const clean = path.split("?")[0].split("#")[0];
  return clean !== "/" ? clean.replace(/\/+$/, "") : "/";
}

export default function AnimatedLink({
  href,
  text,
  className,
  startsWith = false,
}: Props) {
  const pathname = usePathname();

  const current = normalize(pathname || "/");
  const target = normalize(href);

  const isActive = startsWith
    ? (current === target || current.startsWith(target + "/"))
    : current === target;

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={[
        styles.link,
        isActive ? styles.active : "",
        className ?? "",
      ].join(" ")}
    >
      <span className={styles.actualText}>&nbsp;{text}&nbsp;</span>
      <span aria-hidden="true" className={styles.hoverText}>
        &nbsp;{text}&nbsp;
      </span>
    </Link>
  );
}
