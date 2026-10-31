import type { Heat, Report } from "./types";

export const WINDOW_MS = 48 * 60 * 60 * 1000;

const OFFICIAL = /t-?\s?money|moov|togocom|flooz/i;

export function normalizeNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) return `+228${digits}`;
  if (digits.length === 11 && digits.startsWith("228")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("00228")) return `+${digits.slice(2)}`;
  return "";
}

export function heatFor(count: number): Heat | null {
  if (count <= 0) return null;
  if (count === 1) return "vu";
  if (count < 4) return "revient";
  return "arnaqueur";
}

export function heatLabel(heat: Heat | null) {
  if (heat === "vu") return "Déjà vu une fois";
  if (heat === "revient") return "Ça revient";
  if (heat === "arnaqueur") return "Arnaqueur actif";
  return "";
}

export function recentRedReports(reports: Report[], now = Date.now()) {
  return reports.filter(
    (report) =>
      report.verdict === "rouge" &&
      report.numero &&
      now - new Date(report.createdAt).getTime() <= WINDOW_MS,
  );
}

export function numberCards(reports: Report[], now = Date.now()) {
  const groups = new Map<string, Report[]>();
  for (const report of recentRedReports(reports, now)) {
    const numero = normalizeNumber(report.numero);
    if (!numero) continue;
    const list = groups.get(numero) ?? [];
    list.push(report);
    groups.set(numero, list);
  }

  return [...groups.entries()]
    .map(([numero, items]) => {
      const ordered = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const latest = ordered[0];
      return {
        numero,
        count: ordered.length,
        heat: heatFor(ordered.length),
        lastAt: latest.createdAt,
        script: latest.script,
        messageSimple: latest.messageSimple,
        exemple: ordered.every((item) => item.source === "demo"),
      };
    })
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
}

export function gangs(reports: Report[], now = Date.now()) {
  const groups = new Map<string, Set<string>>();
  for (const report of recentRedReports(reports, now)) {
    const numero = normalizeNumber(report.numero);
    const script = report.script.trim().toLowerCase();
    if (!numero || script.length < 4) continue;
    const set = groups.get(script) ?? new Set<string>();
    set.add(numero);
    groups.set(script, set);
  }

  return [...groups.entries()]
    .filter(([, numeros]) => numeros.size >= 2)
    .map(([script, numeros]) => ({
      script,
      numeros: [...numeros],
      count: numeros.size,
    }));
}

export function isOfficialSender(value: string) {
  return OFFICIAL.test(value) && normalizeNumber(value) === "";
}
