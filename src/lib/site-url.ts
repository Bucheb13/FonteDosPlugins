export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.fontedosplugins.com.br").replace(/\/+$/, "");
}

export function absoluteUrl(path: string) {
  const base = getSiteUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

