import { heatLabel } from "@/lib/reputation";
import type { PublicReport } from "@/lib/types";

const STAMP = {
  vert: "bg-[#e7f6ee] text-[#1f6b45] border-[#1f6b45]",
  orange: "bg-[#fff4e0] text-[#a15c07] border-[#a15c07]",
  rouge: "bg-[#fde8e4] text-[#9f1d1d] border-[#9f1d1d]",
};

export function VerdictCard({ report }: { report: PublicReport }) {
  const hunted = report.heat === "arnaqueur";
  return (
    <article
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
          {report.verdict}
        </p>
        {report.heat ? (
          <p className={`text-sm font-semibold ${hunted ? "text-white" : "text-danger"}`}>
            {heatLabel(report.heat)}
            {report.count > 0 ? ` · ${report.count} en 48 h` : ""}
          </p>
        ) : null}
      </div>
      <p className="mt-4 text-lg leading-7">{report.messageSimple}</p>
      {report.numero ? (
        <p className={`mt-3 font-mono text-sm ${hunted ? "text-white" : ""}`}>{report.numero}</p>
      ) : null}
      {report.suiteArnaque ? (
        <p className={`mt-3 text-sm leading-6 ${hunted ? "text-white/90" : "text-[#5c5348]"}`}>
          Suite probable : {report.suiteArnaque}
        </p>
      ) : null}
      {report.actions.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm">
          {report.actions.map((action) => (
            <li key={action}>• {action}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
