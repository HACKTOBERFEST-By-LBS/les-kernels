import type { ChatMode, Scan, ScamType, Verdict } from "./types";

export type RuleHit = { verdict: Verdict; type: ScamType; raison: string };

type Rule = RuleHit & { test: (text: string, expediteur: string) => boolean };

const END = "(?![A-Za-zÀ-ÿ0-9])";
const PHONE = String.raw`(?:\+?228[\s.-]?)?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}`;
const OPERATOR = /t-?\s?money|moov|flooz|togocom|mobile money|momo/i;

function re(source: string) {
  return new RegExp(source, "i");
}

const ASK_CODE = re(
  String.raw`(envo[iy]\w*|donn\w*|communiqu\w*|transf[eé]r\w*|partag\w*|dict\w*|indiqu\w*|confirm\w*)[^.\n]{0,40}(code|pin|mot de passe|otp)${END}`,
);
const CODE_TO_NUMBER = re(String.raw`(code|pin)${END}[^.\n]{0,40}(au|à|a)\s*${PHONE}`);
const SEND_BACK = re(String.raw`(renvo[iy](ez|er|e|es)?|retourn(ez|er|e)|rembours(ez|er))${END}`);
const BY_MISTAKE = re(String.raw`par erreur`);
const LINK = re(
  String.raw`https?://|www\.|[a-z0-9-]+\.(com|net|org|info|xyz|top|site|online|link|tg|example|me|ly)${END}`,
);
const FEES_FOR_GAIN = re(
  String.raw`(frais|pay(ez|er)|réglez|reglez|cotis\w*)[^.\n]{0,50}(retrait|d[ée]blocage|dossier|activation|gain|lot|validation)`,
);
const PRIZE = re(String.raw`(vous avez gagn|tu as gagn|f[ée]licitation|tirage au sort|grand gagnant|tontine)`);
const CONTACT_NUMBER = re(
  String.raw`(appel(ez|le)|contact(ez|e)|[ée]cri(vez|s)|whatsapp|envo(yez|ie)|transf[eé]r(ez|e)|d[ée]pos(ez|e))${END}[^.\n]{0,30}${PHONE}`,
);
const USSD = /\*\d{2,4}(\*[\d*#]+)*#/;

const RULES: Rule[] = [
  {
    verdict: "rouge",
    type: "demande_code",
    raison: "On te demande ton code ou ton PIN. T-Money et Moov ne le demandent jamais.",
    test: (text) => ASK_CODE.test(text) || CODE_TO_NUMBER.test(text),
  },
  {
    verdict: "rouge",
    type: "depot_par_erreur",
    raison: "On te demande de renvoyer de l'argent. Un vrai dépôt ne se renvoie jamais à un particulier.",
    test: (text) => SEND_BACK.test(text) || (BY_MISTAKE.test(text) && CONTACT_NUMBER.test(text)),
  },
  {
    verdict: "rouge",
    type: "faux_gain",
    raison: "On te demande de payer des frais pour toucher un gain. C'est toujours une arnaque.",
    test: (text) => FEES_FOR_GAIN.test(text),
  },
  {
    verdict: "rouge",
    type: "lien_piege",
    raison: "Le message contient un lien. Les avis T-Money et Moov n'en contiennent pas.",
    test: (text) => LINK.test(text),
  },
  {
    verdict: "rouge",
    type: "faux_agent",
    raison: "Le message dit venir de T-Money ou Moov mais il arrive d'un numéro de téléphone. Les vrais avis arrivent sous le nom de l'opérateur.",
    test: (text, expediteur) => OPERATOR.test(text) && isPhoneSender(expediteur),
  },
  {
    verdict: "orange",
    type: "faux_agent",
    raison: "Le message te demande de contacter ou payer un numéro privé.",
    test: (text) => CONTACT_NUMBER.test(text),
  },
  {
    verdict: "orange",
    type: "faux_gain",
    raison: "Le message annonce un gain. Méfie-toi des gains que tu n'as pas demandés.",
    test: (text) => PRIZE.test(text),
  },
  {
    verdict: "orange",
    type: "demande_code",
    raison: "Le message te fait taper un code avec * et #. Ne le tape que si tu l'as demandé toi-même.",
    test: (text) => USSD.test(text),
  },
];

const RANK: Record<Verdict, number> = { vert: 0, orange: 1, rouge: 2 };

const DEFAULT_MESSAGE: Record<Verdict, string> = {
  rouge: "C'est une arnaque. Ne renvoie rien, ne donne aucun code, ne clique sur rien.",
  orange: "Ce message est douteux. Ne fais rien avant d'avoir vérifié.",
  vert: "Ce message ressemble à un vrai avis de transaction.",
};

const DEFAULT_ACTIONS: Record<Verdict, string[]> = {
  rouge: [
    "Ne renvoie pas d'argent et ne donne aucun code.",
    "Vérifie ton vrai solde dans ton compte Mobile Money.",
  ],
  orange: [
    "Vérifie ton vrai solde dans ton compte Mobile Money.",
    "N'appelle pas le numéro du message.",
  ],
  vert: ["Vérifie quand même ton solde avant de dépenser l'argent."],
};

export function isPhoneSender(expediteur: string) {
  const digits = expediteur.replace(/\D/g, "");
  return digits.length >= 8 && !/[a-z]{3,}/i.test(expediteur);
}

export function evaluateRules(text: string, expediteur = ""): RuleHit[] {
  const hits: RuleHit[] = [];
  for (const rule of RULES) {
    if (rule.test(text, expediteur)) {
      hits.push({ verdict: rule.verdict, type: rule.type, raison: rule.raison });
    }
  }
  return hits.sort((a, b) => RANK[b.verdict] - RANK[a.verdict]);
}

export function worst(a: Verdict, b: Verdict): Verdict {
  return RANK[a] >= RANK[b] ? a : b;
}

export function applyRules(text: string, scan: Scan): Scan {
  const hits = evaluateRules(text, scan.expediteur);
  if (hits.length === 0) {
    return {
      ...scan,
      messageSimple: scan.messageSimple || DEFAULT_MESSAGE[scan.verdict],
      actions: scan.actions.length ? scan.actions : DEFAULT_ACTIONS[scan.verdict],
    };
  }

  const verdict = worst(scan.verdict, hits[0].verdict);
  const raised = verdict !== scan.verdict;
  const ruleReasons = hits.map((hit) => hit.raison);
  return {
    ...scan,
    verdict,
    type: scan.type === "aucune" || scan.type === "autre" ? hits[0].type : scan.type,
    raisons: [...new Set([...ruleReasons, ...scan.raisons])].slice(0, 4),
    messageSimple: raised || !scan.messageSimple ? DEFAULT_MESSAGE[verdict] : scan.messageSimple,
    actions: raised || scan.actions.length === 0 ? DEFAULT_ACTIONS[verdict] : scan.actions,
  };
}

const MONEY_WORDS = /fcfa|\bcfa\b|solde|t-?\s?money|moov|flooz|mobile money|transfert|d[ée]p[ôo]t/i;

export function looksLikeMoneySms(text: string) {
  return evaluateRules(text).length > 0 || MONEY_WORDS.test(text);
}

export function scamOverridesCourse(mode: ChatMode, text: string) {
  if (!text || mode === "scanner") return false;
  if (mode === "attente_cours") return evaluateRules(text).some((hit) => hit.verdict === "rouge");
  return looksLikeMoneySms(text);
}

export function headline(verdict: Verdict) {
  if (verdict === "rouge") return "ARNAQUE";
  if (verdict === "orange") return "DOUTEUX";
  return "NORMAL";
}
