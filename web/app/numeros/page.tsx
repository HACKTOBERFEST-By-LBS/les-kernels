"use client";

import { useEffect, useState } from "react";
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

const CARD = {
  vu: "border-[#e6c48a] bg-[#fff8ef]",
  revient: "border-[#e7a097] bg-[#fde8e4]",
  arnaqueur: "border-[#7f1d1d] bg-[#7f1d1d] text-white",
};

export default function NumerosPage() {
  const [numbers, setNumbers] = useState<Card[]>([]);
  const [gangs, setGangs] = useState<Gang[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/numeros", { cache: "no-store" });
    const body = (await response.json()) as { numbers: Card[]; gangs: Gang[] };
    setNumbers(body.numbers);
    setGangs(body.gangs);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function seed() {
    setBusy(true);
    await fetch("/api/demo/seed", { method: "POST" });
    await load();
    setBusy(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Numéros signalés</h1>
          <p className="mt-2 max-w-xl text-[#5c5348]">
            Un signalement colore la carte. À partir de quatre signalements en 48 heures, le numéro devient
            arnaqueur actif. Les exemples du jury sont marqués.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void seed()}
          disabled={busy}
          className="rounded-full bg-[#1d1914] px-5 py-2 text-sm font-semibold text-[#f3ecdf] disabled:opacity-60"
        >
          {busy ? "Chargement…" : "Afficher l'exemple du jury"}
        </button>
      </div>

      {numbers.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line bg-card px-5 py-8 text-[#5c5348]">
          Aucun numéro pour l&apos;instant. Analyse un SMS rouge, ou charge l&apos;exemple.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {numbers.map((card) => {
            const heat = card.heat ?? "vu";
            const hunted = heat === "arnaqueur";
            return (
              <article key={card.numero} className={`rounded-3xl border p-5 ${CARD[heat]}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-lg">{card.numero}</p>
                  {card.exemple ? (
                    <span className={`text-xs uppercase tracking-wide ${hunted ? "text-white/80" : "text-[#5c5348]"}`}>
                      Exemple
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm font-semibold">
                  {heatLabel(card.heat)} · {card.count} signalement{card.count > 1 ? "s" : ""}
                </p>
                <p className={`mt-2 text-sm leading-6 ${hunted ? "text-white/90" : ""}`}>{card.messageSimple}</p>
                <p className={`mt-3 text-xs ${hunted ? "text-white/70" : "text-[#5c5348]"}`}>{card.script}</p>
              </article>
            );
          })}
        </div>
      )}

      {gangs.length > 0 ? (
        <section className="rounded-3xl border border-line bg-card p-5">
          <h2 className="font-serif text-2xl">Même texte, numéros différents</h2>
          <div className="mt-4 flex flex-col gap-4">
            {gangs.map((gang) => (
              <div key={gang.script}>
                <p className="font-medium">{gang.script}</p>
                <p className="mt-1 font-mono text-sm text-[#5c5348]">{gang.numeros.join(" · ")}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
