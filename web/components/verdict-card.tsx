import { heatLabel } from "@/lib/reputation";
import { headline } from "@/lib/rules";
import type { PublicReport } from "@/lib/types";

const STAMP = {
  vert: "bg-[#e7f6ee] text-[#1f6b45] border-[#1f6b45]",
  orange: "bg-[#fff4e0] text-[#8a4e05] border-[#a15c07]",
  rouge: "bg-[#fde8e4] text-[#9f1d1d] border-[#9f1d1d]",
};

export function VerdictCard({ report }: { report: PublicReport }) {
  const hunted = report.heat === "arnaqueur";
  const muted = hunted ? "text-white/90" : "text-[#5c5348]";
  return (
    <article
      aria-label={`Verdict : ${headline(report.verdict)}`}
      className={`rounded-3xl border p-5 ${
        hunted ? "border-[#7f1d1d] bg-[#7f1d1d] text-white" : "border-line bg-card text-foreground"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p
          className={`rounded-full border px-4 py-1 text-sm font-semibold uppercase tracking-[0.18em] ${
            hunted ? "border-white/40 bg-white/10" : STAMP[report.verdict]
          }`}
        >
          {headline(report.verdict)}
        </p>
        {report.heat ? (
          <p className={`text-sm font-semibold ${hunted ? "text-white" : "text-danger"}`}>
            {heatLabel(report.heat)} · {report.count} personne{report.count > 1 ? "s" : ""} en 48 h
          </p>
        ) : null}
      </div>
      <p className="mt-4 text-lg leading-7">{report.messageSimple}</p>
      {report.similar > 0 ? (
        <p className={`mt-2 text-sm font-semibold ${hunted ? "text-white" : "text-danger"}`}>
          Un message très proche a déjà été signalé par {report.similar} personne{report.similar > 1 ? "s" : ""}.
        </p>
      ) : null}
      {report.montant || report.numero || report.expediteur ? (
        <dl className={`mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm ${muted}`}>
          {report.expediteur ? (
            <>
              <dt>Expéditeur</dt>
              <dd className="font-mono">{report.expediteur}</dd>
            </>
          ) : null}
          {report.montant ? (
            <>
              <dt>Montant</dt>
              <dd>{report.montant}</dd>
            </>
          ) : null}
          {report.numero ? (
            <>
              <dt>Numéro cité</dt>
              <dd className="font-mono">{report.numero}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      {report.raisons.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold">Pourquoi</p>
          <ul className={`mt-1 space-y-1 text-sm leading-6 ${muted}`}>
            {report.raisons.slice(0, 3).map((raison) => (
              <li key={raison}>• {raison}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.suiteArnaque ? (
        <p className={`mt-3 text-sm leading-6 ${muted}`}>Suite probable : {report.suiteArnaque}</p>
      ) : null}
      {report.actions.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold">À faire</p>
          <ul className="mt-1 space-y-1 text-sm">
            {report.actions.map((action) => (
              <li key={action}>• {action}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.verdict === "rouge" ? (
        <p className={`mt-4 text-sm font-semibold ${hunted ? "text-white" : "text-danger"}`}>
          Déjà payé ou donné ton code ? Envoie /victime.
        </p>
      ) : null}
    </article>
  );
}
