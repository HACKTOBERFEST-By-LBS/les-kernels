import { replaceDemoReports } from "./store";
import type { Report } from "./types";

function report(partial: Pick<Report, "numero" | "script" | "messageSimple" | "preview">, hoursAgo: number): Report {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
    source: "demo",
    chatId: "demo",
    preview: partial.preview,
    numero: partial.numero,
    verdict: "rouge",
    montant: "",
    demande: "renvoyer de l'argent",
    lien: "",
    script: partial.script,
    raisons: ["Exemple écrit pour la démo."],
    suiteArnaque: "",
    messageSimple: partial.messageSimple,
    actions: ["Ne transfère rien."],
  };
}

export async function seedDemo() {
  const deposit = {
    numero: "+22890000012",
    script: "dépôt par erreur avec pourboire",
    messageSimple: "Ce message demande de renvoyer un dépôt.",
    preview: "Renvoyez sur +228 90 00 00 12, je vous laisse 5000.",
  };
  const contestA = {
    numero: "+22890000098",
    script: "faux concours frais de retrait",
    messageSimple: "Faux gain. On demande des frais.",
    preview: "Payez 2000 FCFA de frais sur +228 90 00 00 98.",
  };
  const contestB = {
    numero: "+22890000077",
    script: "faux concours frais de retrait",
    messageSimple: "Même texte de faux concours, autre numéro.",
    preview: "Payez les frais sur +228 90 00 00 77.",
  };

  await replaceDemoReports([
    report(deposit, 1),
    report(deposit, 2),
    report(deposit, 3),
    report(deposit, 4),
    report(contestA, 1),
    report(contestA, 5),
    report(contestB, 2),
    report(contestB, 6),
  ]);
}
