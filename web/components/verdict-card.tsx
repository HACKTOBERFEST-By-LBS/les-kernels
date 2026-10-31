import Link from "next/link";
import { heatLabel, TYPE_LABEL } from "@/lib/reputation";
import { headline } from "@/lib/rules";
import type { PublicReport, Verdict } from "@/lib/types";

const VERDICT_STYLE: Record<
  Verdict,
  {
    container: string;
    headerBg: string;
    badge: string;
    code: string;
    sublabel: string;
  }
> = {
  rouge: {
    container: "border-danger bg-card",
    headerBg: "bg-danger-soft border-b border-danger-border",
    badge: "bg-danger text-white border-danger",
    code: "ALERTE ROUGE",
    sublabel: "Ne répondez pas et n'envoyez rien",
  },
  orange: {
    container: "border-warn bg-card",
    headerBg: "bg-warn-soft border-b border-warn-border",
    badge: "bg-warn text-white border-warn",
    code: "VÉRIFICATION REQUISE",
    sublabel: "Prudence avant toute opération",
  },
  vert: {
    container: "border-safe bg-card",
    headerBg: "bg-safe-soft border-b border-safe-border",
    badge: "bg-safe text-white border-safe",
    code: "FORMAT CONFORME",
    sublabel: "Aucune demande suspecte détectée",
  },
};

export function VerdictCard({
  report,
  onVictimAction,
}: {
  report: PublicReport;
  onVictimAction?: () => void;
}) {
  const style = VERDICT_STYLE[report.verdict];
  const hunted = report.heat === "arnaqueur";
  const scamCategory =
    report.typeArnaque && report.typeArnaque !== "aucune" ? TYPE_LABEL[report.typeArnaque] : "";
  const hasExtractedData = Boolean(
    report.expediteur || report.montant || report.numero || report.lien || scamCategory,
  );

  return (
    <article
      aria-label={`Verdict : ${headline(report.verdict)}`}
      className={`overflow-hidden rounded-xl border-2 shadow-xs ${style.container}`}
    >
      <div className={`px-4 py-3.5 sm:px-5 ${style.headerBg}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider ${style.badge}`}
            >
              <span>[{style.code}]</span>
              <span>{headline(report.verdict)}</span>
            </span>
            <span className="text-xs font-semibold text-foreground">{style.sublabel}</span>
          </div>

          {report.heat ? (
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${
                hunted
                  ? "bg-danger text-white"
                  : "border border-danger-border bg-card text-danger"
              }`}
            >
              {heatLabel(report.heat)} ({report.count} pers. en 48 h)
            </span>
          ) : null}
        </div>

        <p className="mt-3 text-base font-bold leading-snug text-foreground sm:text-lg">
          {report.messageSimple}
        </p>

        {report.similar > 0 ? (
          <p className="mt-2 inline-flex items-center rounded-md border border-danger-border bg-card px-2.5 py-1 text-xs font-semibold text-danger">
            Mémoire collective : message similaire déjà signalé par {report.similar} personne
            {report.similar > 1 ? "s" : ""}.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {report.actions.length > 0 ? (
          <section
            aria-label="Gestes recommandés"
            className="rounded-lg border border-line bg-background p-3.5"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Que faire maintenant
            </h3>
            <ol className="mt-2 space-y-1.5 text-sm font-medium leading-6 text-foreground">
              {report.actions.map((action, index) => (
                <li key={action} className="flex items-start gap-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-foreground font-mono text-xs font-bold text-card">
                    {index + 1}
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {hasExtractedData ? (
          <section aria-label="Relevé des éléments lus dans le message">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Éléments relevés dans le message
            </h3>
            <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {scamCategory ? (
                <div className="rounded-lg border border-line bg-background px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Catégorie identifiée
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-foreground">{scamCategory}</dd>
                </div>
              ) : null}
              {report.expediteur ? (
                <div className="rounded-lg border border-line bg-background px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Expéditeur affiché
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                    {report.expediteur}
                  </dd>
                </div>
              ) : null}
              {report.montant ? (
                <div className="rounded-lg border border-line bg-background px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Montant mentionné
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
                    {report.montant}
                  </dd>
                </div>
              ) : null}
              {report.numero ? (
                <div className="rounded-lg border border-line bg-background px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Numéro cité dans le SMS
                  </dt>
                  <dd className="mt-0.5 flex flex-wrap items-center justify-between gap-2 font-mono text-sm font-bold tabular-nums text-foreground">
                    <span>{report.numero}</span>
                    {report.verdict === "rouge" ? (
                      <Link
                        href="/numeros"
                        className="font-sans text-xs font-semibold text-danger underline hover:no-underline"
                      >
                        Voir sur le mur
                      </Link>
                    ) : null}
                  </dd>
                </div>
              ) : null}
              {report.lien ? (
                <div className="rounded-lg border border-danger-border bg-danger-soft px-3 py-2 sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-danger">
                    Lien suspect détecté (ne pas ouvrir)
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-xs font-semibold text-danger">
                    {report.lien}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {report.raisons.length > 0 ? (
          <section aria-label="Raisons de ce verdict">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Pourquoi ce verdict
            </h3>
            <ul className="mt-1.5 space-y-1.5 text-sm leading-6 text-muted">
              {report.raisons.slice(0, 4).map((raison) => (
                <li key={raison} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                  <span>{raison}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {report.suiteArnaque ? (
          <div className="rounded-lg border border-warn-border bg-warn-soft px-3.5 py-2.5 text-sm leading-6 text-foreground">
            <span className="font-bold">Suite probable de la manoeuvre : </span>
            <span>{report.suiteArnaque}</span>
          </div>
        ) : null}

        {report.verdict === "rouge" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger-border bg-danger-soft px-3.5 py-3">
            <p className="text-sm font-bold text-danger">
              Vous avez déjà envoyé l&apos;argent ou donné votre code secret ?
            </p>
            {onVictimAction ? (
              <button
                type="button"
                onClick={onVictimAction}
                className="inline-flex min-h-11 items-center rounded-lg bg-danger px-4 py-2 text-xs font-bold text-white hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
              >
                Voir les démarches d&apos;urgence
              </button>
            ) : (
              <span className="font-mono text-xs font-bold text-danger">
                Envoyez /victime pour les démarches d&apos;urgence
              </span>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
