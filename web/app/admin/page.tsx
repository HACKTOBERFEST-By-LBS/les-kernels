"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TYPE_LABEL } from "@/lib/reputation";
import { headline } from "@/lib/rules";
import type { Report, Verdict } from "@/lib/types";

type Session =
  | { reachable: false; detail?: string }
  | { reachable: true; ok: boolean; connected: boolean; ready: boolean; qr: string | null };

type AdminReport = Pick<
  Report,
  "id" | "createdAt" | "source" | "verdict" | "typeArnaque" | "numero" | "messageSimple"
>;

const VERDICT_BADGE: Record<Verdict, string> = {
  rouge: "bg-danger text-white",
  orange: "bg-warn text-white",
  vert: "bg-safe text-white",
};

const SOURCE_LABEL: Record<Report["source"], string> = {
  whatsapp: "Canal WhatsApp",
  web: "Scanner Web",
  demo: "Exemple Démo",
};

function qrSrc(qr: string) {
  if (qr.startsWith("data:image")) return qr;
  if (/^[A-Za-z0-9+/=]+$/.test(qr) && qr.length > 100) return `data:image/png;base64,${qr}`;
  return null;
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastCheck, setLastCheck] = useState("");

  const load = useCallback(async () => {
    try {
      const [sessionResponse, reportsResponse] = await Promise.all([
        fetch("/api/admin/session", { cache: "no-store" }),
        fetch("/api/reports", { cache: "no-store" }),
      ]);
      setSession((await sessionResponse.json()) as Session);
      const body = (await reportsResponse.json()) as { reports: AdminReport[] };
      setReports(body.reports);
      setLastCheck(
        new Intl.DateTimeFormat("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
      );
    } catch {
      setSession({ reachable: false, detail: "Impossible de contacter le serveur du site." });
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => {
      void load();
    }, 0);
    const timer = window.setInterval(() => void load(), 4000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [load]);

  async function seedFromAdmin() {
    setBusy(true);
    try {
      await fetch("/api/demo/seed", { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(session?.reachable && session.ready);
  const waitingQr = Boolean(session?.reachable && !session.ready);
  const image = session?.reachable && session.qr ? qrSrc(session.qr) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-strong bg-surface-alt px-4 py-3">
        <p className="text-xs font-semibold text-foreground sm:text-sm">
          <strong>Espace équipe :</strong> Cette page sert uniquement à relier le téléphone WhatsApp de démonstration. Le scanner sur le site fonctionne même si WhatsApp est éteint.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-foreground px-4 py-2 text-xs font-bold text-card hover:opacity-90"
        >
          &larr; Retourner au scanner de SMS
        </Link>
      </div>

      <header className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-foreground px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-card">
              Supervision de l&apos;équipe
            </span>
            {lastCheck ? (
              <span className="font-mono text-xs text-muted">Vérifié à {lastCheck} (auto 4 s)</span>
            ) : null}
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Relais WhatsApp &amp; journal des analyses
          </h1>
          <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-muted">
            Reliez un numéro WhatsApp par QR code pour que les utilisateurs puissent transférer leurs SMS suspects sur WhatsApp. Aucun numéro personnel d&apos;utilisateur n&apos;est affiché ici.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-line-strong bg-card px-4 py-2 text-xs font-bold text-foreground hover:border-foreground"
        >
          Vérifier l&apos;état maintenant
        </button>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section
          aria-label="État de la liaison WhatsApp"
          className="rounded-xl border-2 border-line-strong bg-card p-5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              État du téléphone relais
            </h2>
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-1 font-mono text-xs font-bold uppercase ${
                !session
                  ? "bg-surface-alt text-foreground"
                  : ready
                    ? "bg-safe text-white"
                    : waitingQr
                      ? "bg-warn text-white"
                      : "bg-surface-alt text-foreground"
              }`}
            >
              {!session
                ? "Vérification..."
                : ready
                  ? "[EN LIGNE] Prêt"
                  : waitingQr
                    ? "[ACTION] Scanner le QR"
                    : "[ARRÊTÉ] Hors ligne"}
            </span>
          </div>

          <p className="mt-3 text-xl font-extrabold text-foreground">
            {!session
              ? " interrogation du service WhatsApp..."
              : ready
                ? "Numéro WhatsApp connecté"
                : waitingQr
                  ? "En attente du scan du QR code"
                  : "Service WhatsApp non démarré"}
          </p>

          {ready ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Le numéro de l&apos;équipe reçoit et analyse les SMS et captures envoyés sur WhatsApp.
            </p>
          ) : null}

          {session && !session.reachable ? (
            <div className="mt-3 rounded-lg border border-line bg-background p-3.5 text-xs leading-relaxed text-muted">
              <p className="font-bold text-foreground">Comment activer le canal WhatsApp :</p>
              <ol className="mt-1.5 space-y-1">
                <li>1. Ouvrez un terminal dans le dossier <code className="font-mono font-bold text-foreground">openwa</code> (ou lancez Docker).</li>
                <li>2. Exécutez <code className="font-mono font-bold text-foreground">npm start</code>.</li>
                <li>3. Scannez le QR code qui apparaîtra ici avec le téléphone de l&apos;équipe.</li>
              </ol>
            </div>
          ) : null}

          {image ? (
            <div className="mt-4 flex flex-col items-center rounded-xl border border-line bg-background p-4">
              <Image
                src={image}
                alt="QR code de connexion WhatsApp à scanner avec le téléphone de l'équipe"
                width={240}
                height={240}
                unoptimized
                className="h-60 w-60 rounded-lg border border-line bg-white p-2"
              />
              <p className="mt-2 text-center text-xs font-semibold text-foreground">
                Ouvrez WhatsApp &rarr; Appareils connectés &rarr; Connecter un appareil
              </p>
            </div>
          ) : null}

          {waitingQr && !image ? (
            <p className="mt-3 rounded-lg border border-warn-border bg-warn-soft p-3 text-xs font-semibold text-foreground">
              Le service WhatsApp est démarré. Scannez le QR code affiché dans le terminal où tourne le relais.
            </p>
          ) : null}
        </section>

        <section
          aria-label="Journal des 12 dernières analyses"
          className="rounded-xl border border-line bg-card p-5 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-foreground">
                12 dernières analyses enregistrées
              </h2>
              <p className="text-xs text-muted">
                Flux anonymisé des verdicts rendus sur le site et sur WhatsApp (sans numéro ni texte privé de l&apos;expéditeur de la demande).
              </p>
            </div>
            <span className="rounded-md bg-background px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-foreground">
              {reports.length} entrée{reports.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {reports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-strong bg-background p-6 text-center">
                <p className="text-sm font-bold text-foreground">Aucune analyse enregistrée pour le moment</p>
                <p className="mt-1 text-xs text-muted">
                  Testez un message depuis le scanner ou chargez les exemples de démonstration.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void seedFromAdmin()}
                    className="inline-flex min-h-11 items-center rounded-lg bg-foreground px-4 py-2 text-xs font-bold text-card hover:opacity-90 disabled:opacity-60"
                  >
                    {busy ? "Chargement..." : "Charger les exemples du jury"}
                  </button>
                  <Link
                    href="/"
                    className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-4 py-2 text-xs font-bold text-foreground hover:border-foreground"
                  >
                    Aller au scanner
                  </Link>
                </div>
              </div>
            ) : (
              reports.map((report) => {
                const category =
                  report.typeArnaque && report.typeArnaque !== "aucune"
                    ? TYPE_LABEL[report.typeArnaque]
                    : "Format standard";
                return (
                  <article
                    key={report.id}
                    className="flex flex-col gap-1.5 rounded-lg border border-line bg-background px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${VERDICT_BADGE[report.verdict]}`}
                        >
                          {headline(report.verdict)}
                        </span>
                        <span className="text-xs font-bold text-foreground">{category}</span>
                        <span className="rounded border border-line-strong bg-card px-2 py-0.5 font-mono text-[11px] font-semibold text-muted">
                          {SOURCE_LABEL[report.source]}
                        </span>
                      </div>
                      {report.numero ? (
                        <span className="font-mono text-xs font-bold tabular-nums text-danger">
                          Numéro cité : {report.numero}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium text-foreground">{report.messageSimple}</p>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
