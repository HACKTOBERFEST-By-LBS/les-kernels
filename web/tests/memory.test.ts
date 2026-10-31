import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLES } from "../lib/examples.ts";
import { similarReports } from "../lib/reputation.ts";
import { applyMemory } from "../lib/rules.ts";
import type { Report, Scan } from "../lib/types.ts";

const NOW = Date.parse("2026-10-31T12:00:00Z");

function reported(chatId: string, preview: string): Report {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date(NOW - 3_600_000).toISOString(),
    source: "web",
    chatId,
    preview,
    numero: "+22800000012",
    verdict: "rouge",
    typeArnaque: "depot_par_erreur",
    expediteur: "",
    montant: "",
    demande: "",
    lien: "",
    script: "",
    raisons: [],
    suiteArnaque: "",
    messageSimple: "",
    actions: [],
  };
}

const deposit = EXAMPLES.find((example) => example.label === "Dépôt par erreur")!.text;
const seeded = "Renvoyez sur +228 00 00 00 12, je vous laisse 5000.";

test("le dépôt par erreur de la démo retrouve les signalements de l'exemple du jury", () => {
  const reports = ["demo:1", "demo:2", "demo:3"].map((who) => reported(who, seeded));
  const memory = similarReports(reports, deposit, "web:moi", NOW);
  assert.equal(memory.people, 3);
  assert.deepEqual(memory.previews, [seeded]);
});

test("mes propres signalements ne comptent pas, ni un message sans rapport", () => {
  const reports = [reported("web:moi", seeded), reported("web:autre", "Je passe demain prendre les pagnes au marché.")];
  assert.equal(similarReports(reports, deposit, "web:moi", NOW).people, 0);
});

test("deux personnes ayant signalé un message proche empêchent un verdict normal", () => {
  const scan: Scan = {
    verdict: "vert",
    type: "aucune",
    expediteur: "",
    texteLu: "",
    numero: "",
    montant: "",
    demande: "",
    lien: "",
    raisons: [],
    suiteArnaque: "",
    messageSimple: "Message normal.",
    actions: [],
  };
  assert.equal(applyMemory(scan, 2).verdict, "orange");
  assert.equal(applyMemory(scan, 1).verdict, "vert");
  assert.equal(applyMemory(scan, 1).raisons.length, 1);
});
