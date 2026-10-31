export type Command =
  | { type: "menu" }
  | { type: "verifier" }
  | { type: "apprendre" }
  | { type: "plan"; date: string }
  | { type: "quiz" }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "conseils" }
  | { type: "victime" }
  | { type: "unknown"; name: string };

const NAMES = new Map<string, Exclude<Command["type"], "unknown" | "plan">>([
  ["menu", "menu"],
  ["aide", "menu"],
  ["verifier", "verifier"],
  ["vérifier", "verifier"],
  ["scanner", "verifier"],
  ["apprendre", "apprendre"],
  ["quiz", "quiz"],
  ["resume", "resume"],
  ["résumé", "resume"],
  ["stop", "stop"],
  ["conseils", "conseils"],
  ["conseil", "conseils"],
  ["victime", "victime"],
  ["arnaque", "victime"],
]);

export function parseCommand(text: string): Command | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const slash = trimmed.startsWith("/");
  const bare = slash ? trimmed.slice(1).trim() : trimmed;
  if (!slash && !/^(menu|aide|verifier|vérifier|scanner)$/i.test(bare)) return null;
  if (slash && bare === "") return { type: "menu" };

  const [head, ...rest] = bare.split(/\s+/);
  const key = head.toLowerCase();
  if (key === "plan") return { type: "plan", date: rest.join(" ").trim() };

  const kind = NAMES.get(key);
  if (!kind) return slash ? { type: "unknown", name: head } : null;
  return { type: kind };
}

export function menuText() {
  return [
    "Alerte Marché",
    "Envoie un SMS, une capture, ou choisis :",
    "",
    "/verifier — je lis un message",
    "/conseils — les 5 réflexes anti-arnaque",
    "/victime — j'ai déjà payé, que faire ?",
    "/apprendre — réviser un cours",
    "/plan — plan jusqu'à l'examen",
    "/quiz — une question",
    "/resume — une fiche",
    "/stop — revenir au scanner",
    "",
    "Sans commande, j'analyse le message.",
  ].join("\n");
}
