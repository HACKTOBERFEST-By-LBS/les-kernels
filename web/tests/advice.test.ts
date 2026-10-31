import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCommand } from "../lib/commands.ts";
import { adviceFor, VICTIM_STEPS } from "../lib/knowledge.ts";

test("une arnaque reçoit d'abord nos conseils fixes, pas ceux du modèle", () => {
  const actions = adviceFor("rouge", "depot_par_erreur", ["Conseil inventé par le modèle."]);
  assert.match(actions[0], /vrai solde/);
  assert.ok(actions.length <= 3);
});

test("un message normal garde un conseil de prudence", () => {
  assert.equal(adviceFor("vert", "aucune", []).length, 1);
});

test("les commandes de conseils existent seulement avec /", () => {
  assert.deepEqual(parseCommand("/conseils"), { type: "conseils" });
  assert.deepEqual(parseCommand("/victime"), { type: "victime" });
  assert.equal(parseCommand("victime"), null);
});

test("les étapes victime ne contiennent aucun numéro de téléphone inventé", () => {
  assert.doesNotMatch(VICTIM_STEPS, /\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/);
});

test("parseCommand garde /plan avec sa date", () => {
  assert.deepEqual(parseCommand("/plan 12 novembre"), { type: "plan", date: "12 novembre" });
  assert.deepEqual(parseCommand("/résumé"), { type: "resume" });
});
