import assert from "node:assert/strict";
import { test } from "node:test";
import { applyRules, evaluateRules, headline } from "../lib/rules.ts";
import type { Scan } from "../lib/types.ts";
import { EXAMPLES } from "../lib/examples.ts";

function scan(partial: Partial<Scan>): Scan {
  return {
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
    messageSimple: "C'est un vrai message T-Money.",
    actions: [],
    ...partial,
  };
}

const text = (label: string) => EXAMPLES.find((example) => example.label === label)!.text;

test("un vrai avis de transaction ne déclenche aucune règle", () => {
  assert.deepEqual(evaluateRules(text("Avis officiel"), "TMONEY"), []);
});

test("un envoi d'argent effectué vers un numéro n'est pas pris pour une demande", () => {
  assert.deepEqual(
    evaluateRules("T-Money: Transfert de 5000 FCFA vers 90123456 effectué. Solde: 1000 FCFA. Ref: TM1."),
    [],
  );
});

test("le dépôt par erreur est rouge même si le modèle dit vert", () => {
  const result = applyRules(text("Dépôt par erreur"), scan({ verdict: "vert" }));
  assert.equal(result.verdict, "rouge");
  assert.equal(result.type, "depot_par_erreur");
  assert.notEqual(result.messageSimple, "C'est un vrai message T-Money.");
});

test("le faux concours est rouge", () => {
  assert.equal(applyRules(text("Faux concours"), scan({})).verdict, "rouge");
});

test("la demande de code vers un numéro est rouge", () => {
  const hits = evaluateRules(text("Presque officiel"));
  assert.equal(hits[0].verdict, "rouge");
  assert.ok(hits.some((hit) => hit.type === "demande_code"));
});

test("un avis T-Money envoyé depuis un numéro de téléphone est rouge", () => {
  const result = applyRules(text("Avis officiel"), scan({ expediteur: "+228 90 12 34 56" }));
  assert.equal(result.verdict, "rouge");
  assert.equal(result.type, "faux_agent");
});

test("les règles ne font jamais baisser un verdict rouge du modèle", () => {
  assert.equal(applyRules("Bonjour", scan({ verdict: "rouge" })).verdict, "rouge");
});

test("le titre du verdict est fixé par le code", () => {
  assert.equal(headline("rouge"), "ARNAQUE");
  assert.equal(headline("orange"), "DOUTEUX");
  assert.equal(headline("vert"), "NORMAL");
});
