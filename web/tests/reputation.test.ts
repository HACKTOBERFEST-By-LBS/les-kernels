import assert from "node:assert/strict";
import { test } from "node:test";
import { WINDOW_MS, gangs, heatFor, normalizeNumber, numberCards, reportersFor } from "../lib/reputation.ts";
import type { Report } from "../lib/types.ts";

const NOW = Date.parse("2026-10-31T12:00:00Z");

function report(partial: Partial<Report>): Report {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date(NOW - 60_000).toISOString(),
    source: "web",
    chatId: "web:a",
    preview: "",
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
    ...partial,
  };
}

test("normalizeNumber accepte les trois écritures togolaises et refuse le reste", () => {
  assert.equal(normalizeNumber("00 00 00 12"), "+22800000012");
  assert.equal(normalizeNumber("228 00000012"), "+22800000012");
  assert.equal(normalizeNumber("00228 00 00 00 12"), "+22800000012");
  assert.equal(normalizeNumber("+229 00 00 00 12"), "");
});

test("une même personne qui vérifie quatre fois ne fait pas un arnaqueur actif", () => {
  const reports = [1, 2, 3, 4].map(() => report({ chatId: "web:meme-personne" }));
  assert.equal(reportersFor(reports, "+228 00 00 00 12", NOW), 1);
  assert.equal(numberCards(reports, NOW)[0].heat, "vu");
});

test("quatre personnes différentes font un arnaqueur actif", () => {
  const reports = ["a", "b", "c", "d"].map((who) => report({ chatId: `web:${who}` }));
  assert.equal(numberCards(reports, NOW)[0].heat, "arnaqueur");
});

test("un signalement de plus de 48 h ne compte plus", () => {
  const old = report({ createdAt: new Date(NOW - WINDOW_MS - 1).toISOString() });
  assert.equal(reportersFor([old], "+22800000012", NOW), 0);
});

test("seuils de chaleur", () => {
  assert.equal(heatFor(0), null);
  assert.equal(heatFor(1), "vu");
  assert.equal(heatFor(3), "revient");
  assert.equal(heatFor(4), "arnaqueur");
});

test("deux numéros avec le même type d'arnaque forment un groupe", () => {
  const result = gangs(
    [
      report({ numero: "+22800000098", typeArnaque: "faux_gain" }),
      report({ numero: "+22800000077", typeArnaque: "faux_gain" }),
      report({ numero: "+22800000012", typeArnaque: "depot_par_erreur" }),
    ],
    NOW,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].count, 2);
});
