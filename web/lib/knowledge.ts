import type { ScamType, Verdict } from "./types";

type Example = {
  expediteur: string;
  sms: string;
  verdict: Verdict;
  type: ScamType;
  raison: string;
};

export const EXAMPLES_ANNOTES: Example[] = [
  {
    expediteur: "TMONEY",
    sms: "Vous avez recu 25000 FCFA de K. A. (228XXXX0012). Nouveau solde: 31500 FCFA. Ref: TM2610310001.",
    verdict: "vert",
    type: "aucune",
    raison: "Expéditeur officiel, opération déjà faite, solde et référence, aucune demande.",
  },
  {
    expediteur: "MOOV",
    sms: "Retrait de 10000 FCFA effectue chez l'agent 12345. Frais: 200 FCFA. Solde: 4800 FCFA. ID: MM2610310002.",
    verdict: "vert",
    type: "aucune",
    raison: "Avis de retrait fait par toi : montant, frais, solde, identifiant. Les frais d'un retrait réel sont normaux.",
  },
  {
    expediteur: "MABANQUE",
    sms: "Debit de 15000 FCFA sur votre compte ***4521 le 31/10 a 09:12. Solde disponible: 120000 FCFA.",
    verdict: "vert",
    type: "aucune",
    raison: "Avis bancaire factuel, compte masqué, aucune demande ni lien.",
  },
  {
    expediteur: "+228 00 00 00 12",
    sms: "Bonjour maman, j'ai fait un depot de 30000 par erreur sur ton numero. Stp renvoie moi 25000 et garde 5000.",
    verdict: "rouge",
    type: "depot_par_erreur",
    raison: "Un particulier demande de renvoyer un dépôt. Le faux avis de dépôt arrive souvent juste avant.",
  },
  {
    expediteur: "+228 00 00 00 31",
    sms: "T-Money: Vous avez recu 50000 FCFA. Nouveau solde 50500 FCFA. Ref TM0000.",
    verdict: "rouge",
    type: "faux_agent",
    raison: "Imite un avis T-Money mais vient d'un numéro de téléphone : le solde annoncé est faux.",
  },
  {
    expediteur: "+228 00 00 00 98",
    sms: "FELICITATION! Votre numero a gagne 500.000F au tirage MOOV. Pour recevoir envoyez 5000F de frais de dossier au 00000098.",
    verdict: "rouge",
    type: "faux_gain",
    raison: "Gain non demandé, frais à payer, numéro privé, majuscules et fautes.",
  },
  {
    expediteur: "+228 00 00 00 45",
    sms: "Service client MOOV: votre compte sera suspendu. Composez *155*4*1*00000045*50000# pour le reactiver.",
    verdict: "rouge",
    type: "demande_code",
    raison: "Menace de suspension et code à taper qui envoie en réalité 50000 F au numéro de l'escroc.",
  },
  {
    expediteur: "+228 00 00 00 52",
    sms: "MABANQUE: votre carte est bloquee suite a une activite suspecte. Verifiez vos informations sous 24h: https://mabanque-securite.example",
    verdict: "rouge",
    type: "banque_bloquee",
    raison: "Fausse alerte bancaire : urgence, lien, numéro privé. Une banque ne demande jamais tes informations par lien.",
  },
  {
    expediteur: "INFO-COLIS",
    sms: "Votre colis est bloque a la douane. Reglez 3500 FCFA de frais de livraison au +228 00 00 00 63 pour le recevoir.",
    verdict: "rouge",
    type: "faux_colis",
    raison: "Colis que tu n'attends pas, frais à payer à un particulier.",
  },
  {
    expediteur: "+228 00 00 00 74",
    sms: "Recrutement urgent ONG: 150000F/mois, travail a domicile. Frais d'inscription 10000F par T-Money au 00000074.",
    verdict: "rouge",
    type: "faux_emploi",
    raison: "Un vrai employeur ne fait jamais payer l'embauche.",
  },
  {
    expediteur: "+228 00 00 00 85",
    sms: "Pret rapide sans garantie jusqu'a 1 million en 1h. Payez d'abord 7500F de frais de dossier.",
    verdict: "rouge",
    type: "faux_pret",
    raison: "Prêt sans garantie avec frais payés d'avance : l'argent du prêt n'arrive jamais.",
  },
  {
    expediteur: "+228 00 00 00 96",
    sms: "Tonton c'est moi Kodjo, j'ai change de numero. Je suis bloque a l'hopital, envoie moi 20000 vite stp.",
    verdict: "rouge",
    type: "urgence_proche",
    raison: "Faux proche avec nouveau numéro et urgence. Appelle la personne sur son ancien numéro avant tout.",
  },
  {
    expediteur: "+228 00 00 00 20",
    sms: "Bonjour, c'est Afi du marche. Je passe demain prendre les 3 pagnes.",
    verdict: "vert",
    type: "aucune",
    raison: "Message personnel sans argent ni demande sensible.",
  },
];

const ADVICE: Record<ScamType, string[]> = {
  depot_par_erreur: [
    "Ne renvoie rien : vérifie ton vrai solde dans ton compte, le dépôt n'existe sans doute pas.",
    "Un vrai dépôt par erreur se règle par l'opérateur, jamais par un particulier.",
  ],
  faux_gain: [
    "Tu ne peux pas gagner à un jeu auquel tu n'as pas joué.",
    "Ne paie aucun frais pour recevoir un gain.",
  ],
  faux_agent: [
    "Les vrais avis arrivent sous le nom TMONEY, MOOV ou de ta banque, pas d'un numéro.",
    "Vérifie ton solde toi-même dans ton compte.",
  ],
  demande_code: [
    "Ne donne jamais ton code ou ton PIN, même à un « agent ».",
    "Ne tape pas un code avec * et # que tu n'as pas choisi toi-même.",
  ],
  lien_piege: ["N'ouvre pas le lien.", "Passe par l'application officielle ou par l'agence."],
  banque_bloquee: [
    "Ne donne aucune information par SMS ou par lien.",
    "Appelle ta banque avec le numéro au dos de ta carte, ou va en agence.",
  ],
  faux_colis: [
    "Si tu n'attends pas de colis, ignore le message.",
    "Ne paie jamais de frais de livraison à un numéro privé.",
  ],
  faux_emploi: [
    "Un vrai employeur ne fait jamais payer l'embauche.",
    "Cherche l'entreprise toi-même avant de répondre.",
  ],
  faux_pret: [
    "Ne paie jamais de frais avant de recevoir un prêt.",
    "Passe par une banque ou une microfinance connue.",
  ],
  urgence_proche: [
    "Appelle ton proche sur son ancien numéro avant d'envoyer quoi que ce soit.",
    "Pose-lui une question que lui seul connaît.",
  ],
  autre: ["Ne fais rien dans l'urgence.", "Demande l'avis d'un proche avant d'envoyer de l'argent."],
  aucune: ["Ne fais rien dans l'urgence.", "Demande l'avis d'un proche avant d'envoyer de l'argent."],
};

const NORMAL_MESSAGE =
  "Ce message a la forme d'un avis déjà exécuté : le nom de l'opérateur, un montant, l'autre partie, un nouveau solde et une référence. Il ne demande ni de renvoyer l'argent, ni un code, ni d'ouvrir un lien. Contrôlez quand même le solde dans votre application avant de considérer cet argent comme disponible.";

const EXPLAIN: Record<ScamType, string> = {
  depot_par_erreur:
    "C'est l'arnaque au dépôt par erreur. On vous affirme qu'un transfert est arrivé sur votre compte et on vous demande de le renvoyer, souvent en vous laissant une petite commission. Ce dépôt n'existe presque jamais : le solde à croire est celui de votre application, pas celui du SMS. Si vous renvoyez l'argent, il part de votre vrai solde et vous ne le récupérez pas. Ne répondez pas, n'appelez pas ce numéro, et ne faites aucun transfert.",
  faux_gain:
    "C'est une arnaque au faux gain. On vous annonce un lot ou un concours auquel vous n'avez pas joué, puis on vous fait payer des frais de retrait, de dossier ou d'activation. L'argent promis n'existe pas : les frais, eux, partent tout de suite. N'envoyez rien et n'ouvrez aucun lien, même si le message cite Moov ou T-Money.",
  faux_agent:
    "Ce message se fait passer pour T-Money, Moov ou une banque, mais un vrai avis arrive sous le nom de l'entreprise, pas depuis un numéro de téléphone. Ici on vous pousse à appeler, à confirmer ou à payer un particulier. Ne rappelez pas ce numéro et vérifiez l'opération uniquement dans votre application officielle.",
  demande_code:
    "On vous demande votre code, votre PIN, ou de taper une suite avec * et #. T-Money, Moov et votre banque ne demandent jamais ces codes : les taper peut valider un retrait vers le numéro de l'escroc. Ne dictez rien, ne transférez rien, et ne composez aucun code que vous n'avez pas choisi vous-même.",
  lien_piege:
    "Le message contient un lien à ouvrir pour « confirmer », « débloquer » ou « recevoir ». Les avis T-Money et Moov n'envoient pas de lien. La page imite un service officiel pour prendre votre code ou votre argent. N'ouvrez pas le lien : passez par l'application officielle ou par l'agence.",
  banque_bloquee:
    "On vous menace de bloquer votre compte, votre carte ou votre ligne, puis on vous demande de confirmer par un lien ou par SMS. Une vraie banque ne règle pas ça dans un message. N'envoyez aucune information. Vérifiez en agence, ou appelez le numéro écrit au dos de votre carte.",
  faux_colis:
    "On vous annonce un colis retenu, souvent en douane, et des frais à payer à un numéro privé pour le libérer. Si vous n'attendez pas de colis, ignorez le message. Même si vous en attendez un, ne payez jamais la livraison à un particulier : passez par le transporteur que vous avez choisi.",
  faux_emploi:
    "On vous promet un emploi, souvent à domicile, puis des frais d'inscription, de dossier ou de formation avant de commencer. Un vrai employeur ne fait pas payer l'embauche. Ne versez rien et cherchez l'entreprise vous-même avant de répondre.",
  faux_pret:
    "On vous promet un crédit rapide, puis des frais de dossier ou d'avance à payer avant de recevoir l'argent. Le prêt n'arrive pas : seuls les frais partent. Ne payez jamais pour débloquer un crédit. Passez par une banque ou une microfinance que vous connaissez déjà.",
  urgence_proche:
    "Quelqu'un se présente comme un proche, annonce un nouveau numéro et demande de l'argent tout de suite, souvent pour un hôpital ou un accident. L'urgence sert à vous empêcher d'appeler le vrai numéro. Appelez cette personne sur son ancien numéro, et posez-lui une question que vous êtes seuls à connaître, avant d'envoyer quoi que ce soit.",
  autre:
    "Ce message pousse à agir vite : payer, rappeler ou confirmer, sans que vous puissiez vérifier par vous-même. L'urgence et le numéro privé sont les signes à retenir. Ne faites rien tant que vous n'avez pas contrôlé le solde dans votre application et demandé l'avis d'un proche.",
  aucune: NORMAL_MESSAGE,
};

const SUITE: Partial<Record<ScamType, string>> = {
  depot_par_erreur: "Ensuite on insiste, on menace de porter plainte, ou on demande un second renvoi « pour corriger l'erreur ».",
  faux_gain: "Ensuite on réclame d'autres frais : taxe, code de validation, ou un second paiement pour « débloquer » le lot.",
  faux_agent: "Ensuite on demande le code reçu par SMS, ou un transfert « de vérification » vers un autre numéro.",
  demande_code: "Dès que le code est donné, un retrait part vers le numéro de l'escroc.",
  lien_piege: "La page demande le code reçu par SMS ou les identifiants de l'application.",
  banque_bloquee: "Le lien ou l'appel demande la carte, le code, ou un virement « de déblocage ».",
  faux_colis: "Après le premier paiement, de nouveaux frais apparaissent : douane, stockage, livraison express.",
  faux_emploi: "Après les frais d'inscription, on réclame un uniforme, un badge ou une formation payante.",
  faux_pret: "Le prêt est « approuvé » mais bloqué jusqu'à un nouveau paiement.",
  urgence_proche: "Le montant augmente, ou un second proche écrit pour confirmer l'histoire.",
  autre: "La prochaine étape est presque toujours un paiement ou un code.",
};

export function explainFor(verdict: Verdict, type: ScamType) {
  if (verdict === "vert") return NORMAL_MESSAGE;
  if (type === "aucune") return EXPLAIN.autre;
  return EXPLAIN[type] ?? EXPLAIN.autre;
}

export function suiteFor(type: ScamType) {
  return SUITE[type] ?? "";
}

const LEGIT_TONE = /vrai (avis|message)|aucune demande|message conforme|pas une arnaque|rien de suspect|message normal/i;

export function chooseMessage(current: string, verdict: Verdict, type: ScamType) {
  const text = current.trim();
  const denies = LEGIT_TONE.test(text);
  if (text.length >= 240 && !(verdict !== "vert" && denies)) return text;
  return explainFor(verdict, type);
}

export function adviceFor(verdict: Verdict, type: ScamType, modelActions: string[]) {
  if (verdict === "vert") {
    return modelActions.length ? modelActions.slice(0, 2) : ["Vérifie quand même ton solde avant de dépenser l'argent."];
  }
  return [...new Set([...ADVICE[type], ...modelActions])].slice(0, 3);
}

export const REFLEXES = [
  "Les 5 réflexes anti-arnaque :",
  "1. Personne de T-Money, Moov ou de ta banque ne te demande ton code ou ton PIN.",
  "2. Un dépôt reçu « par erreur » ne se renvoie pas : vérifie ton vrai solde.",
  "3. Les vrais avis viennent d'un nom (TMONEY, MOOV, ta banque), pas d'un numéro.",
  "4. Aucun frais à payer pour un gain, un colis, un emploi ou un prêt.",
  "5. Devant l'urgence, attends et appelle quelqu'un de confiance.",
  "",
  "Un doute ? Envoie-moi le SMS.",
].join("\n");

export const VICTIM_STEPS = [
  "Tu as déjà payé ou donné ton code ? Agis vite :",
  "1. Arrête tout échange avec l'escroc. N'envoie plus rien.",
  "2. Préviens tout de suite ton opérateur ou ta banque par son canal officiel (agence ou service client officiel) pour bloquer l'opération ou ton compte.",
  "3. Si tu as donné ton code ou ton PIN, change-le maintenant.",
  "4. Garde les preuves : captures du SMS, numéro, références de transaction.",
  "5. Porte plainte au commissariat avec ces preuves.",
  "6. Envoie-moi le SMS : le numéro sera signalé aux autres.",
].join("\n");

export function examplesPrompt() {
  return [
    "Exemples annotés (fictifs) pour t'aider à juger :",
    ...EXAMPLES_ANNOTES.map(
      (example, index) =>
        `${index + 1}. Expéditeur : ${example.expediteur}\n   SMS : ${example.sms}\n   → verdict ${example.verdict}, type ${example.type} : ${example.raison}`,
    ),
  ].join("\n");
}
