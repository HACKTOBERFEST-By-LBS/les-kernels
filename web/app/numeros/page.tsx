"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { heatLabel } from "@/lib/reputation";
import type { Heat } from "@/lib/types";

type Card = {
  numero: string;
  count: number;
  heat: Heat | null;
  lastAt: string;
  script: string;
  messageSimple: string;
  exemple: boolean;
};

type Gang = { script: string; numeros: string[]; count: number };

const HEAT_STYLE: Record<
  Heat,
  {
    border: string;
    headerBg: string;
    badge: string;
    code: string;
  }
> = {
  arnaqueur: {
    border: "border-2 border-danger bg-card",
    headerBg: "bg-danger-soft border-b border-danger-border",
    badge: "bg-danger text-white",
    code: "NIVEAU 3 : ARNAQUEUR ACTIF",
  },
  revient: {
    border: "border-2 border-warn bg-card",
    headerBg: "bg-warn-soft border-b border-warn-border",
    badge: "bg-warn text-white",
    code: "NIVEAU 2 : SIGNALEMENTS MULTIPLES",
  },
  vu: {
    border: "border border-line-strong bg-card",
    headerBg: "bg-background border-b border-line",
    badge: "bg-foreground text-card",
    code: "NIVEAU 1 : PREMIER SIGNALEMENT",
  },
};

function formatPhoneReadable(num: string) {
  const clean = num.replace(/\s+/g, "");
  if (clean.startsWith("+228") && clean.length === 12) {
    const rest = clean.slice(4);
    return `+228 ${rest.slice(0, 2)} ${rest.slice(2, 4)} ${rest.slice(4, 6)} ${rest.slice(6, 8)}`;
  }
  return num;
}

export default function NumerosPage() {
  const [numbers, setNumbers] = useState<Card[]>([]);
  const [gangs, setGangs] = useState<Gang[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [heatFilter, setHeatFilter] = useState<"all" | Heat>("all");
  const [lastUpdated, setLastUpdated] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/numeros", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { numbers: Card[]; gangs: Gang[] };
      setNumbers(body.numbers);
      setGangs(body.gangs);
      setError("");
      setLastUpdated(
        new Intl.DateTimeFormat("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
      );
    } catch {
      setError("Impossible de charger la liste des numéros. Vérifiez votre connexion et réessayez.");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 10000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [load]);

  async function seed() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/demo/seed", { method: "POST" });
      if (!response.ok) throw new Error(String(response.status));
      await load();
    } catch {
      setError("Les numéros d'exemple n'ont pas pu être chargés. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, "");
  const filteredNumbers = numbers.filter((card) => {
    const heat = card.heat ?? "vu";
    if (heatFilter !== "all" && heat !== heatFilter) return false;
    if (!normalizedQuery) return true;
    const numClean = card.numero.toLowerCase().replace(/\s+/g, "");
    const scriptClean = card.script.toLowerCase();
    const msgClean = card.messageSimple.toLowerCase();
    return (
      numClean.includes(normalizedQuery) ||
      scriptClean.includes(query.trim().toLowerCase()) ||
      msgClean.includes(query.trim().toLowerCase())
    );
  });

  const activeCount = numbers.filter((c) => c.heat === "arnaqueur").length;
  const repeatCount = numbers.filter((c) => c.heat === "revient").length;
  const seenOnceCount = numbers.filter((c) => (c.heat ?? "vu") === "vu").length;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line-strong bg-card px-2.5 py-1 text-xs font-bold text-foreground hover:border-foreground"
            >
              <span>&larr; Retour au scanner de SMS</span>
            </Link>
            <span className="inline-flex items-center rounded-md bg-danger-soft px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-danger">
              Fenêtre de surveillance : 48 heures
            </span>
            {lastUpdated ? (
              <span className="font-mono text-xs text-muted">Mis à jour à {lastUpdated}</span>
            ) : null}
          </div>
          <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Répertoire des numéros signalés
          </h1>
          <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-muted">
            Chaque personne qui soumet un SMS d&apos;arnaque compte une seule fois par numéro. À partir de 4 personnes différentes en 48 heures, le numéro passe en <strong>Arnaqueur actif</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy || initialLoading}
            className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-4 py-2 text-xs font-bold text-foreground hover:border-foreground disabled:opacity-60"
          >
            Actualiser la liste
          </button>
          <button
            type="button"
            onClick={() => void seed()}
            disabled={busy}
            className="inline-flex min-h-11 items-center rounded-lg bg-foreground px-4 py-2 text-xs font-bold text-card hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Chargement en cours..." : "Charger les exemples du jury"}
          </button>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-danger bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-11 items-center rounded-lg bg-danger px-3.5 py-1.5 text-xs font-bold text-white"
          >
            Réessayer maintenant
          </button>
        </div>
      ) : null}

      <section
        aria-label="Recherche et filtres des numéros"
        className="flex flex-col gap-3 rounded-xl border border-line-strong bg-card p-4 shadow-xs sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="search-numero" className="text-xs font-bold uppercase tracking-wider text-foreground">
            Vérifier rapidement un numéro ou un type d&apos;arnaque
          </label>
          <div className="flex items-center gap-2">
            <input
              id="search-numero"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tapez les chiffres du numéro (ex. 00 12) ou un motif (ex. dépôt, gain)..."
              className="min-h-11 w-full rounded-lg border border-line-strong bg-background px-3.5 font-mono text-sm text-foreground outline-none focus:border-foreground focus:bg-card focus:ring-2 focus:ring-foreground"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-line-strong bg-background px-3 text-xs font-bold text-foreground hover:border-foreground"
              >
                Effacer
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par niveau d'alerte">
          <button
            type="button"
            onClick={() => setHeatFilter("all")}
            className={`inline-flex min-h-11 items-center rounded-lg border px-3 py-1.5 text-xs font-bold tabular-nums ${
              heatFilter === "all"
                ? "border-foreground bg-foreground text-card"
                : "border-line bg-background text-foreground hover:border-foreground"
            }`}
          >
            Tous ({numbers.length})
          </button>
          <button
            type="button"
            onClick={() => setHeatFilter("arnaqueur")}
            className={`inline-flex min-h-11 items-center rounded-lg border px-3 py-1.5 text-xs font-bold tabular-nums ${
              heatFilter === "arnaqueur"
                ? "border-danger bg-danger text-white"
                : "border-danger-border bg-danger-soft text-danger hover:border-danger"
            }`}
          >
            Arnaqueur actif ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setHeatFilter("revient")}
            className={`inline-flex min-h-11 items-center rounded-lg border px-3 py-1.5 text-xs font-bold tabular-nums ${
              heatFilter === "revient"
                ? "border-warn bg-warn text-white"
                : "border-warn-border bg-warn-soft text-warn hover:border-warn"
            }`}
          >
            Ça revient ({repeatCount})
          </button>
          <button
            type="button"
            onClick={() => setHeatFilter("vu")}
            className={`inline-flex min-h-11 items-center rounded-lg border px-3 py-1.5 text-xs font-bold tabular-nums ${
              heatFilter === "vu"
                ? "border-foreground bg-foreground text-card"
                : "border-line bg-background text-muted hover:border-foreground hover:text-foreground"
            }`}
          >
            Vu 1 fois ({seenOnceCount})
          </button>
        </div>
      </section>

      {initialLoading ? (
        <div
          role="status"
          aria-label="Chargement des numéros signalés"
          className="grid gap-4 md:grid-cols-2"
        >
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="rounded-xl border border-line bg-card p-5">
              <div className="h-5 w-40 rounded bg-surface-alt" />
              <div className="mt-3 h-7 w-48 rounded bg-surface-alt" />
              <div className="mt-3 h-12 w-full rounded bg-background" />
            </div>
          ))}
        </div>
      ) : numbers.length === 0 ? (
        <section className="rounded-xl border border-dashed border-line-strong bg-card p-6 text-center sm:p-8">
          <h2 className="text-lg font-extrabold text-foreground">
            Aucun numéro signalé sur les dernières 48 heures
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">
            Dès qu&apos;un SMS frauduleux contenant un numéro est analysé, ce numéro apparaît ici pour protéger les autres utilisateurs.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void seed()}
              disabled={busy}
              className="inline-flex min-h-11 items-center rounded-lg bg-foreground px-4 py-2.5 text-xs font-bold text-card hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Chargement..." : "Charger les exemples du jury"}
            </button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:border-foreground"
            >
              Analyser un SMS maintenant
            </Link>
          </div>
        </section>
      ) : filteredNumbers.length === 0 ? (
        <section className="rounded-xl border border-line-strong bg-card p-6 text-center">
          <h2 className="text-base font-extrabold text-foreground">
            Aucun numéro ne correspond à votre filtre « {query || heatFilter} »
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Si vous venez de recevoir un SMS suspect de ce numéro, analysez-le directement dans le scanner.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setHeatFilter("all");
              }}
              className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-background px-4 py-2 text-xs font-bold text-foreground hover:border-foreground"
            >
              Réinitialiser la recherche
            </button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-lg bg-danger px-4 py-2 text-xs font-bold text-white"
            >
              Vérifier le SMS dans le scanner
            </Link>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2" aria-live="polite">
          {filteredNumbers.map((card) => {
            const heat = card.heat ?? "vu";
            const style = HEAT_STYLE[heat];
            return (
              <article key={card.numero} className={`overflow-hidden rounded-xl shadow-xs ${style.border}`}>
                <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 ${style.headerBg}`}>
                  <span className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${style.badge}`}>
                    [{style.code}]
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                      {card.count} personne{card.count > 1 ? "s" : ""} en 48 h
                    </span>
                    {card.exemple ? (
                      <span className="rounded border border-line-strong bg-card px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-muted">
                        Exemple fictif
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-mono text-xl font-extrabold tracking-tight tabular-nums text-foreground">
                      {formatPhoneReadable(card.numero)}
                    </p>
                    <span className="text-xs font-bold text-muted">{heatLabel(card.heat)}</span>
                  </div>

                  <p className="text-sm font-semibold leading-relaxed text-foreground">{card.messageSimple}</p>

                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 text-xs text-muted">
                    <span>
                      Motif identifié : <strong className="text-foreground">{card.script}</strong>
                    </span>
                    <span className="font-mono">Ne jamais rappeler</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {gangs.length > 0 ? (
        <section
          aria-label="Campagnes coordonnées utilisant plusieurs numéros"
          className="rounded-xl border-2 border-line-strong bg-card p-5 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-foreground">
                Même scénario d&apos;arnaque repéré sur plusieurs numéros
              </h2>
              <p className="text-xs text-muted">
                Lorsque plusieurs numéros emploient la même méthode en 48 h, ils sont regroupés ici.
              </p>
            </div>
            <span className="rounded-md bg-surface-alt px-2.5 py-1 font-mono text-xs font-bold text-foreground">
              {gangs.length} groupe{gangs.length > 1 ? "s" : ""} actif{gangs.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {gangs.map((gang) => (
              <div key={gang.script} className="rounded-lg border border-line bg-background p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">{gang.script}</p>
                  <span className="rounded bg-card px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-danger">
                    {gang.count} numéros liés
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {gang.numeros.map((num) => (
                    <span
                      key={num}
                      className="rounded border border-line-strong bg-card px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-foreground"
                    >
                      {formatPhoneReadable(num)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
