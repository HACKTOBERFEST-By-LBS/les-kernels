import { replaceDemoReports } from "./store";
import type { Report } from "./types";

function report(
  partial: Pick<Report, "numero" | "typeArnaque" | "messageSimple" | "preview">,
  hoursAgo: number,
  reporter: number,
): Report {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
    source: "demo",
    chatId: `demo:${reporter}`,
    preview: partial.preview,
    numero: partial.numero,
    verdict: "rouge",
    typeArnaque: partial.typeArnaque,
    expediteur: "",
    montant: "",
    demande: "renvoyer de l'argent",
    lien: "",
    script: partial.typeArnaque,
    raisons: ["Exemple écrit pour la démo."],
    suiteArnaque: "",
    messageSimple: partial.messageSimple,
    actions: ["Ne transfère rien."],
  };
}

export async function seedDemo() {
  const deposit = {
    numero: "+22800000012",
    typeArnaque: "depot_par_erreur" as const,
    messageSimple: "Ce message demande de renvoyer un dépôt.",
    preview: "Renvoyez sur +228 00 00 00 12, je vous laisse 5000.",
  };
  const contestA = {
    numero: "+22800000098",
    typeArnaque: "faux_gain" as const,
    messageSimple: "Faux gain. On demande des frais.",
    preview: "Payez 2000 FCFA de frais sur +228 00 00 00 98.",
  };
  const contestB = {
    numero: "+22800000077",
    typeArnaque: "faux_gain" as const,
    messageSimple: "Même arnaque au faux gain, autre numéro.",
    preview: "Payez les frais sur +228 00 00 00 77.",
  };

  await replaceDemoReports([
    report(deposit, 1, 1),
    report(deposit, 2, 2),
    report(deposit, 3, 3),
    report(deposit, 4, 4),
    report(contestA, 1, 5),
    report(contestA, 5, 6),
    report(contestB, 2, 7),
    report(contestB, 6, 8),
  ]);
}
