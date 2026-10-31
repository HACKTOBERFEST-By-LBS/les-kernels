"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Vérifier un SMS", shortLabel: "Scanner" },
  { href: "/numeros", label: "Numéros signalés", shortLabel: "Numéros" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            aria-label="Alerte Marché - Retour à l'accueil du scanner"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground font-mono text-xs font-bold tracking-tight text-card"
            >
              AM
            </span>
            <span className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight leading-none sm:text-lg">
                Alerte Marché
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-muted leading-none">
                Contrôle SMS T-Money &amp; Moov
              </span>
            </span>
          </Link>
        </div>

        <nav aria-label="Navigation principale" className="flex items-center gap-1.5 sm:gap-2">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-3.5 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                  active
                    ? "bg-foreground text-card shadow-xs"
                    : "border border-transparent text-muted hover:border-line hover:bg-background hover:text-foreground"
                }`}
              >
                <span className="sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
