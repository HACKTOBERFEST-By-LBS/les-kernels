export const EXAMPLES = [
  {
    label: "Avis officiel",
    sender: "TMONEY",
    text: "T-Money: vous avez recu 15000 FCFA de A. K. Solde: 22000 FCFA. Ref: TM000000. Merci.",
  },
  {
    label: "Dépôt par erreur",
    sender: "+228 00 00 00 12",
    text: "Bonjour, j'ai envoye 50000 FCFA par erreur sur votre numero. Renvoyez sur +228 00 00 00 12, je vous laisse 5000.",
  },
  {
    label: "Faux concours",
    sender: "+228 00 00 00 98",
    text: "Félicitations, vous avez gagné 200000 FCFA avec Moov. Payez 2000 FCFA de frais de retrait sur +228 00 00 00 98 puis ouvrez https://moov-gain.example",
  },
  {
    label: "Presque officiel",
    sender: "+228 00 00 00 77",
    text: "Vous avez recu 15000 FCFA de K. A. Confirmez sur https://t-money-verif.example et envoyez le code recu au +228 00 00 00 77.",
  },
] as const;
