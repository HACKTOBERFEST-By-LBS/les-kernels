import { chooseMessage, suiteFor } from "./knowledge.ts";
import type { ChatMode, Scan, ScamType, Verdict } from "./types";

export type RuleHit = { verdict: Verdict; type: ScamType; raison: string };

type Rule = RuleHit & { test: (text: string, expediteur: string) => boolean };

const END = "(?![A-Za-zÀ-ÿ0-9])";
const PHONE = String.raw`(?:\+?228[\s.-]?)?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}`;
const OFFICIAL_CLAIM = /t-?\s?money|moov|flooz|togocom|mobile money|momo|banque|bank|service client/i;

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
const USSD_TO_NUMBER = /\*\d{2,4}(\*\d+)*\*(228)?\d{8}(\*\d+)*#/;
const BLOCKED = re(
  String.raw`(compte|carte|sim|ligne|num[ée]ro)[^.\n]{0,40}(bloqu|suspendu|sera suspendu|d[ée]sactiv|ferm[ée]|r[ée]activ)`,
);
const URGENCY = re(String.raw`(urgent|imm[ée]diatement|sous 24 ?h|dans les 24|dernier d[ée]lai|avant ce soir)`);
const PARCEL_FEES = re(String.raw`(colis|livraison|douane)[^\n]{0,80}(frais|pay\w*|r[ée]gl\w*)`);
const JOB_FEES = re(
  String.raw`(recrut\w*|emploi|embauche|travail [àa] domicile|offre d'emploi)[^\n]{0,100}(frais|inscription|pay\w*)`,
);
const LOAN_FEES = re(
  String.raw`(pr[êe]t|cr[ée]dit rapide|cr[ée]dit sans)[^\n]{0,100}(frais de dossier|frais d'avance|pay(ez|er) d'abord|en avance)`,
);
const CLOSE_ONE = re(
  String.raw`(nouveau num[ée]ro|chang[ée] de num[ée]ro|c'est moi)[\s\S]{0,150}?(envo[iy]\w*|transf[eé]r\w*|d[ée]pos\w*|pr[êe]te)`,
);

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
    raison: "Le message dit venir d'un opérateur ou d'une banque mais il arrive d'un numéro de téléphone. Les vrais avis arrivent sous le nom de l'entreprise.",
    test: (text, expediteur) => OFFICIAL_CLAIM.test(text) && isPhoneSender(expediteur),
  },
  {
    verdict: "rouge",
    type: "demande_code",
    raison: "Ce code avec * et # contient un numéro de téléphone : le taper envoie ton argent à ce numéro.",
    test: (text) => USSD_TO_NUMBER.test(text),
  },
  {
    verdict: "rouge",
    type: "faux_colis",
    raison: "On te fait payer des frais pour un colis. Les faux colis bloqués sont une arnaque courante.",
    test: (text) => PARCEL_FEES.test(text),
  },
  {
    verdict: "rouge",
    type: "faux_emploi",
    raison: "On te fait payer pour un emploi. Un vrai employeur ne fait jamais payer l'embauche.",
    test: (text) => JOB_FEES.test(text),
  },
  {
    verdict: "rouge",
    type: "faux_pret",
    raison: "On te fait payer des frais avant un prêt. L'argent du prêt n'arrive jamais.",
    test: (text) => LOAN_FEES.test(text),
  },
  {
    verdict: "rouge",
    type: "urgence_proche",
    raison: "Un « proche » avec un nouveau numéro demande de l'argent. Appelle-le sur son ancien numéro avant tout.",
    test: (text) => CLOSE_ONE.test(text),
  },
  {
    verdict: "orange",
    type: "banque_bloquee",
    raison: "Le message menace de bloquer ton compte ou ta carte. Vérifie directement en agence ou dans l'application officielle.",
    test: (text) => BLOCKED.test(text),
  },
  {
    verdict: "orange",
    type: "autre",
    raison: "Le message te presse. L'urgence sert à t'empêcher de réfléchir.",
    test: (text) => URGENCY.test(text),
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

export function mentionedPhone(text: string) {
  return new RegExp(PHONE).exec(text)?.[0] ?? "";
}

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
      messageSimple: chooseMessage(scan.messageSimple, scan.verdict, scan.type),
      suiteArnaque: scan.suiteArnaque || (scan.verdict === "vert" ? "" : suiteFor(scan.type)),
      actions: scan.actions.length ? scan.actions : DEFAULT_ACTIONS[scan.verdict],
    };
  }

  const verdict = worst(scan.verdict, hits[0].verdict);
  const raised = verdict !== scan.verdict;
  const type = scan.type === "aucune" || scan.type === "autre" ? hits[0].type : scan.type;
  const ruleReasons = hits.map((hit) => hit.raison);
  return {
    ...scan,
    verdict,
    type,
    raisons: [...new Set([...ruleReasons, ...scan.raisons])].slice(0, 4),
    messageSimple: chooseMessage(scan.messageSimple, verdict, type),
    suiteArnaque: scan.suiteArnaque || (verdict === "vert" ? "" : suiteFor(type)),
    actions: raised || scan.actions.length === 0 ? DEFAULT_ACTIONS[verdict] : scan.actions,
  };
}

export function applyMemory(scan: Scan, people: number): Scan {
  if (people <= 0) return scan;
  const raison = `Ce message ressemble beaucoup à des arnaques déjà signalées par ${people} personne${people > 1 ? "s" : ""}.`;
  const verdict = people >= 2 ? worst(scan.verdict, "orange") : scan.verdict;
  const raised = verdict !== scan.verdict;
  return {
    ...scan,
    verdict,
    raisons: [raison, ...scan.raisons].slice(0, 4),
    messageSimple: chooseMessage(raised ? "" : scan.messageSimple, verdict, scan.type),
    suiteArnaque: scan.suiteArnaque || (verdict === "vert" ? "" : suiteFor(scan.type)),
    actions: raised ? DEFAULT_ACTIONS[verdict] : scan.actions,
  };
}

export function rulesOnlyScan(text: string, expediteur = ""): Scan | null {
  if (evaluateRules(text, expediteur).length === 0) return null;
  const base: Scan = {
    verdict: "vert",
    type: "aucune",
    expediteur,
    texteLu: text,
    numero: new RegExp(PHONE).exec(text)?.[0] ?? "",
    montant: "",
    demande: "",
    lien: "",
    raisons: [],
    suiteArnaque: "",
    messageSimple: "",
    actions: [],
  };
  const scan = applyRules(text, base);
  return {
    ...scan,
    raisons: [...scan.raisons, "Analyse partielle : Gemma n'a pas répondu, seules les règles de base ont parlé."].slice(-4),
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

const RISK_RANGE: Record<Verdict, [number, number]> = {
  vert: [5, 25],
  orange: [40, 70],
  rouge: [80, 99],
};

export function riskPercent(verdict: Verdict, text: string, expediteur: string, people: number) {
  const hits = evaluateRules(text, expediteur);
  const red = hits.filter((hit) => hit.verdict === "rouge").length;
  const orange = hits.length - red;
  const [low, high] = RISK_RANGE[verdict];
  const raw = low + red * 6 + orange * 4 + Math.min(people, 4) * 3;
  return Math.min(high, Math.max(low, raw));
}

export function headline(verdict: Verdict) {
  if (verdict === "rouge") return "ARNAQUE";
  if (verdict === "orange") return "DOUTEUX";
  return "NORMAL";
}
