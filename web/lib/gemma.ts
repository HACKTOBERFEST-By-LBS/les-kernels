import { GoogleGenAI } from "@google/genai";
import type { Scan, Verdict } from "./types";

const MODEL = "gemma-4-26b-a4b-it";

const SCAN_SYSTEM = `Tu es l'analyste d'Alerte Marché, à Lomé, pour les SMS Mobile Money Moov Money et T-Money.
Tu réponds uniquement avec un objet JSON, sans texte autour.
Le français des champs rédigés est simple, comme pour une vendeuse au marché.
Tu n'inventes pas un numéro absent du message.
verdict vaut exactement vert, orange ou rouge.
vert : avis de transaction, aucune demande d'action.
orange : message incomplet ou douteux.
rouge : on demande de renvoyer de l'argent, un code, un PIN, des frais, ou d'ouvrir un lien.
numero : le numéro du particulier à contacter ou à payer, chiffres seulement avec indicatif si présent, ou une chaîne vide.
script : le scénario en 8 mots maximum. Deux messages du même type reçoivent le même script.
message_simple : deux phrases maximum.
suite_arnaque : le prochain coup probable, ou une chaîne vide si le verdict est vert.
actions : deux consignes courtes.`;

const DANGER =
  /renvoie|renvoyer|envoyez le code|envoie le code|donnez le code|donne le code|votre pin|mot de passe|clique|https?:|frais de retrait|tontine|vous avez gagn/i;

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Réponse illisible");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

async function ask(
  system: string,
  prompt: string,
  image?: { mimeType: string; data: string },
) {
  const ai = client();
  if (!ai) {
    throw new Error("Ajoute GEMINI_API_KEY dans le fichier .env à la racine, puis relance le site.");
  }

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [];
  if (image) parts.push({ inlineData: image });
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: { systemInstruction: system, temperature: 0.2 },
  });

  return response.text ?? "";
}

function asVerdict(value: unknown): Verdict {
  if (value === "vert" || value === "orange" || value === "rouge") return value;
  return "orange";
}

function asList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, 4);
}

export function applySafetyNet(text: string, scan: Scan): Scan {
  const blob = `${text} ${scan.demande} ${scan.lien}`;
  if (scan.verdict === "vert" && DANGER.test(blob)) {
    return {
      ...scan,
      verdict: "orange",
      raisons: [
        ...scan.raisons,
        "Le message demande une action. Un avis officiel annonce une opération, il ne demande pas de renvoyer, de cliquer ou de donner un code.",
      ],
    };
  }
  return scan;
}

export async function scanMessage(
  text: string,
  image?: { mimeType: string; data: string },
) {
  const prompt = [
    "Lis ce message Mobile Money et remplis le JSON :",
    '{"verdict":"vert|orange|rouge","numero":"","montant":"","demande":"","lien":"","script":"","raisons":[],"suite_arnaque":"","message_simple":"","actions":[]}',
    image ? "Le message est dans l'image." : "",
    text ? `Texte :\n${text}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = parseJson<Partial<Scan>>(await ask(SCAN_SYSTEM, prompt, image));
  const scan: Scan = {
    verdict: asVerdict(raw.verdict),
    numero: String(raw.numero ?? ""),
    montant: String(raw.montant ?? ""),
    demande: String(raw.demande ?? ""),
    lien: String(raw.lien ?? ""),
    script: String(raw.script ?? "").slice(0, 80),
    raisons: asList(raw.raisons),
    suite_arnaque: String(raw.suite_arnaque ?? ""),
    message_simple: String(raw.message_simple ?? ""),
    actions: asList(raw.actions),
  };
  return applySafetyNet(`${text} ${scan.lien}`, scan);
}

export async function extractCourse(
  text: string,
  image?: { mimeType: string; data: string },
) {
  const raw = await ask(
    "Tu extrais un cours pour un étudiant à Lomé. Réponds uniquement avec le texte du cours, en français, sans commentaire.",
    text
      ? `Voici le cours :\n${text}`
      : "Le cours est dans l'image. Recopie le contenu utile.",
    image,
  );
  return raw.trim().slice(0, 12000);
}

export async function makePlan(courseText: string, examDate: string, weakTopics: string[]) {
  return (
    await ask(
      "Tu fais un plan de révision court, en français simple. Cinq lignes maximum, une action par jour. Pas de JSON.",
      `Examen : ${examDate}\nNotions déjà ratées : ${weakTopics.join(", ") || "aucune"}\nCours :\n${courseText.slice(0, 6000)}`,
    )
  ).trim();
}

export async function makeQuiz(courseText: string, weakTopics: string[]) {
  const raw = parseJson<{ question?: string; answer?: string }>(
    await ask(
      "Tu poses une seule question de révision. Réponds uniquement en JSON : {\"question\":\"\",\"answer\":\"\"}. La question est en français simple. La réponse attendue tient en une phrase.",
      `Reviens d'abord sur les notions ratées : ${weakTopics.join(", ") || "aucune"}.\nCours :\n${courseText.slice(0, 6000)}`,
    ),
  );
  return {
    question: String(raw.question ?? "").trim(),
    answer: String(raw.answer ?? "").trim(),
  };
}

export async function gradeQuiz(question: string, expected: string, answer: string) {
  const raw = parseJson<{ correct?: boolean; feedback?: string; notion?: string }>(
    await ask(
      "Tu corriges une réponse d'étudiant. JSON uniquement : {\"correct\":true,\"feedback\":\"\",\"notion\":\"\"}. feedback en français simple, deux phrases maximum. notion est le nom court de l'idée ratée, ou une chaîne vide si la réponse est juste.",
      `Question : ${question}\nRéponse attendue : ${expected}\nRéponse de l'étudiant : ${answer}`,
    ),
  );
  return {
    correct: Boolean(raw.correct),
    feedback: String(raw.feedback ?? "").trim(),
    notion: String(raw.notion ?? "").trim(),
  };
}

export async function makeResume(courseText: string) {
  return (
    await ask(
      "Tu rédiges une fiche de révision. Cinq lignes maximum, français simple, sans JSON.",
      courseText.slice(0, 6000),
    )
  ).trim();
}
