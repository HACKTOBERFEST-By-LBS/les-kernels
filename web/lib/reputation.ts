import type { Heat, Report, ScamType } from "./types";

export const WINDOW_MS = 48 * 60 * 60 * 1000;

export const TYPE_LABEL: Record<ScamType, string> = {
  depot_par_erreur: "Faux dépôt par erreur",
  faux_gain: "Faux gain avec frais",
  faux_agent: "Faux agent T-Money ou Moov",
  demande_code: "Vol de code ou de PIN",
  lien_piege: "Lien piégé",
  banque_bloquee: "Fausse alerte de banque",
  faux_colis: "Faux colis bloqué",
  faux_emploi: "Fausse offre d'emploi",
  faux_pret: "Faux prêt rapide",
  urgence_proche: "Faux proche en urgence",
  autre: "Autre arnaque",
  aucune: "",
};

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

export function reportersFor(reports: Report[], numero: string, now = Date.now()) {
  const target = normalizeNumber(numero);
  if (!target) return 0;
  const people = new Set(
    recentRedReports(reports, now)
      .filter((report) => normalizeNumber(report.numero) === target)
      .map((report) => report.chatId),
  );
  return people.size;
}

export const MEMORY_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_SIMILARITY = 0.35;

function words(text: string) {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z]+/)
      .filter((word) => word.length >= 3),
  );
}

export function similarity(a: string, b: string) {
  const left = words(a);
  const right = words(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / (left.size + right.size - shared);
}

export function similarReports(reports: Report[], text: string, chatId: string, now = Date.now()) {
  if (words(text).size < 4) return { people: 0, previews: [] as string[] };
  const matches = reports
    .filter(
      (report) =>
        report.verdict === "rouge" &&
        report.chatId !== chatId &&
        report.preview &&
        now - new Date(report.createdAt).getTime() <= MEMORY_MS,
    )
    .map((report) => ({ report, score: similarity(text, report.preview) }))
    .filter((match) => match.score >= MIN_SIMILARITY)
    .sort((a, b) => b.score - a.score);

  return {
    people: new Set(matches.map((match) => match.report.chatId)).size,
    previews: [...new Set(matches.map((match) => match.report.preview))].slice(0, 3),
  };
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
      const count = new Set(items.map((item) => item.chatId)).size;
      return {
        numero,
        count,
        heat: heatFor(count),
        lastAt: latest.createdAt,
        script: TYPE_LABEL[latest.typeArnaque] || TYPE_LABEL.autre,
        messageSimple: latest.messageSimple,
        exemple: ordered.every((item) => item.source === "demo"),
      };
    })
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
}

export function gangs(reports: Report[], now = Date.now()) {
  const groups = new Map<ScamType, Set<string>>();
  for (const report of recentRedReports(reports, now)) {
    const numero = normalizeNumber(report.numero);
    if (!numero || report.typeArnaque === "aucune" || report.typeArnaque === "autre") continue;
    const set = groups.get(report.typeArnaque) ?? new Set<string>();
    set.add(numero);
    groups.set(report.typeArnaque, set);
  }

  return [...groups.entries()]
    .filter(([, numeros]) => numeros.size >= 2)
    .map(([type, numeros]) => ({
      script: TYPE_LABEL[type],
      numeros: [...numeros],
      count: numeros.size,
    }));
}
