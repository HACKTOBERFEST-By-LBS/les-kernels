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

export function examplesPrompt() {
  return [
    "Exemples annotés (fictifs) pour t'aider à juger :",
    ...EXAMPLES_ANNOTES.map(
      (example, index) =>
        `${index + 1}. Expéditeur : ${example.expediteur}\n   SMS : ${example.sms}\n   → verdict ${example.verdict}, type ${example.type} : ${example.raison}`,
    ),
  ].join("\n");
}
