# Hackathon « Build with Gemma » — Scanner de SMS Mobile Money

Hacktoberfest Hack Day Lomé × LBS CS Club · 31 octobre 2026 · Lomé Business School

## Le problème

Au Togo, le Mobile Money est utilisé partout, et les arnaques par SMS et appels falsifiés sont quotidiennes : « tu as reçu un dépôt par erreur, renvoie-moi… », faux concours, fausses tontines.

## Votre mission

Construire avec **Gemma** un bot (Web ou WhatsApp) qui permet à n'importe qui de savoir en quelques secondes si un SMS Mobile Money est authentique ou s'il s'agit d'une arnaque.

Le bot doit :
1. **Recevoir** la capture d'écran ou le texte d'un SMS Mobile Money suspect.
2. **Analyser** : extraire les infos clés (montant, expéditeur, syntaxe) et vérifier la conformité avec les vrais formats de SMS officiels (T-Money / Moov Money).
3. **Alerter** : répondre clairement, en français simple, si le message est légitime ou une tentative d'escroquerie.

## Règles (équipes de 2 à 4 personnes)

1. Choisir un canal : Web ou WhatsApp.
2. Gemma est essentielle : le projet ne doit pas pouvoir marcher sans elle.
3. Alerte en français simple (bonus : une langue locale, éwé ou kabiyè).
4. Démo en direct de 3 minutes avec de vrais exemples de SMS, légitimes et frauduleux.
5. Aucune vraie donnée personnelle ni vrai numéro : messages d'exemple ou anonymisés.
6. Volet « Apprendre » : actif seulement sur commande commençant par « / ».

### Volet « Apprendre » (complémentaire)

L'étudiant téléverse son cours (PDF, photo ou texte) et révise. Sans commande, le bot reste en mode scanner.

| Commande | Rôle |
| --- | --- |
| `/apprendre` | active le mode apprentissage et invite à téléverser le cours |
| `/plan` | plan d'apprentissage sur plusieurs jours selon la date d'examen |
| `/quiz` | questions sur le cours, avec correction |
| `/resume` | résumé ou fiches de révision |
| `/stop` | retour au scanner d'arnaques |

## Notation (5 critères × 4 points = 20)

1. Compréhension du problème et du public
2. Innovation et originalité
3. Usage de Gemma
4. Démo et qualité technique
5. Impact, faisabilité et respect des contraintes

Départage : critère 2 (innovation), puis critère 4 (démo).

## Planning

| Heure (GMT) | |
| --- | --- |
| 10h30 | début du code |
| 12h30 | déjeuner |
| 13h30 | reprise avec mentors |
| 15h45 | fin du code, préparation du pitch |
| 16h00 | présentations de 3 minutes |
| 17h00 | remise des prix |

## Votre repo

- Ce repo est **privé** et visible uniquement par votre équipe et les organisateurs.
- Commitez **souvent** et avec des messages clairs : un classement des équipes par activité s'affiche sur le wall de l'événement. Les merges, les commits vides et plus de 3 commits par minute ne sont pas comptés.
- Poussez sur la branche `main` (le wall lit la branche par défaut).
- **Ne commitez jamais de clé d'API.** Copiez `.env.example` en `.env`, mettez-y votre `GEMINI_API_KEY`, et gardez `.env` hors de git (déjà dans `.gitignore`).

## Alerte Marché — ce que fait notre projet

Canal : site Next.js, et un numéro WhatsApp relié par QR. Les deux passent par le même cerveau (`web/lib/handle-message.ts`).

**Comment un SMS est jugé**

1. Gemma lit le texte ou la capture avec 13 exemples annotés sous les yeux (`web/lib/knowledge.ts`) : vrais avis d'opérateur et de banque, faux dépôt, faux agent, faux gain, code USSD piégé, fausse alerte de banque, faux colis, faux emploi, faux prêt, faux proche. Il recopie le SMS, repère l'expéditeur, le montant, le numéro à payer, le type d'arnaque, et relève les fautes d'un message qui se dit officiel.
2. **Mémoire collective** : les arnaques proches déjà signalées par d'autres personnes sont transmises à Gemma. La réponse dit « déjà signalé par N personnes », et à partir de 2 personnes le verdict ne peut plus être NORMAL.
3. Des règles fixes repassent derrière Gemma (`web/lib/rules.ts`) : code ou PIN, renvoi d'argent, frais pour un gain, un colis, un emploi ou un prêt, lien, code USSD vers un numéro, faux proche, menace de blocage, urgence, avis « officiel » venant d'un numéro de téléphone. Une règle peut rendre le verdict plus sévère, jamais plus doux.
4. La réponse commence toujours par **ARNAQUE**, **DOUTEUX** ou **NORMAL**, puis dit pourquoi et donne des conseils écrits par l'équipe pour chaque type d'arnaque.
5. Si Gemma ne répond pas, une arnaque évidente est quand même signalée, avec la mention « analyse partielle ».

**Se protéger** : `/conseils` donne les 5 réflexes anti-arnaque, `/victime` dit quoi faire si on a déjà payé ou donné son code.

**Mur des numéros** (`/numeros`) : un numéro signalé rouge par 4 personnes différentes en 48 h devient « Arnaqueur actif ». Une même personne ne compte qu'une fois.

**Volet Apprendre** : `/apprendre`, puis texte, photo ou PDF du cours (les pages s'ajoutent), `/plan 12 novembre`, `/quiz`, `/resume`, `/stop`. Même en mode cours, un message qui ressemble à un SMS d'argent est analysé comme un SMS. Les modes cours se referment seuls après 2 h sans message.

## Démarrer

```bash
cp .env.example .env   # renseigner GEMINI_API_KEY, et changer WA_API_KEY et OPEN_WA_WEBHOOK_SECRET
cd web
npm install
npm run dev
```

Le site s'ouvre sur http://localhost:3000. La clé est lue depuis le `.env` à la racine.

WhatsApp, dans un second terminal (open-wa lit le même `.env`) :

```bash
cd openwa
npm install
npm start
```

Scanne le QR avec le numéro de l'équipe. La page Admin du site montre si la session est connectée. Avec Docker : `docker compose up` à la racine.

## Vérifier

```bash
cd web
npm run typecheck
npm run lint
npm test
```

Les tests couvrent les règles anti-arnaque, la sortie du mode cours et le mur des numéros. L'audit complet et le suivi des corrections sont dans `AUDIT.md`.
