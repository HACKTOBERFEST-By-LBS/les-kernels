import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLES_ANNOTES } from "../lib/knowledge.ts";
import { applyRules, evaluateRules } from "../lib/rules.ts";
import type { Scan } from "../lib/types.ts";

function trustingScan(expediteur: string): Scan {
  return {
    verdict: "vert",
    type: "aucune",
    expediteur,
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
}

for (const example of EXAMPLES_ANNOTES) {
  if (example.verdict === "vert") {
    test(`vrai message, aucune fausse alerte : ${example.sms.slice(0, 50)}`, () => {
      assert.deepEqual(evaluateRules(example.sms, example.expediteur), []);
    });
  } else {
    test(`arnaque rattrapée même si Gemma dit normal : ${example.sms.slice(0, 50)}`, () => {
      const result = applyRules(example.sms, trustingScan(example.expediteur));
      assert.equal(result.verdict, "rouge");
    });
  }
}
