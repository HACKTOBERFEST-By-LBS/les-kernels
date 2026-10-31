import { menuText, parseCommand } from "./commands";
import {
  ConfigError,
  extractCourse,
  gradeQuiz,
  makePlan,
  makeQuiz,
  makeResume,
  scanMessage,
} from "./gemma";
import { adviceFor, REFLEXES, VICTIM_STEPS } from "./knowledge";
import { heatFor, heatLabel, normalizeNumber, reportersFor, similarReports } from "./reputation";
import { applyMemory, headline, rulesOnlyScan, scamOverridesCourse } from "./rules";
import { addReport, getChat, readStore, saveChat } from "./store";
import type { ChatState, HandleResult, PublicReport, Report, Scan, Source } from "./types";

type Incoming = {
  chatId: string;
  text: string;
  image?: { mimeType: string; data: string };
  sender?: string;
  source: Exclude<Source, "demo">;
};

function reply(chat: ChatState, text: string, report: PublicReport | null = null): HandleResult {
  return { reply: text, mode: chat.mode, report };
}

function countFor(numero: string) {
  return reportersFor(readStore().reports, numero);
}

function toPublic(report: Report): PublicReport {
  const count = countFor(report.numero);
  return {
    verdict: report.verdict,
    typeArnaque: report.typeArnaque,
    expediteur: report.expediteur,
    numero: normalizeNumber(report.numero),
    montant: report.montant,
    lien: report.lien,
    raisons: report.raisons,
    suiteArnaque: report.suiteArnaque,
    messageSimple: report.messageSimple,
    actions: report.actions,
    heat: report.verdict === "rouge" ? heatFor(count) : null,
    count,
    similar: 0,
  };
}

async function analyze(chat: ChatState, incoming: Incoming): Promise<HandleResult> {
  const text = incoming.text.trim();
  if (!text && !incoming.image) {
    return reply(chat, "Envoie le SMS ou la capture.");
  }

  const reports = readStore().reports;
  const before = similarReports(reports, text, chat.chatId);
  let scan: Scan;
  try {
    scan = await scanMessage(text, incoming.image, incoming.sender, before.previews);
  } catch (error) {
    const fallback = error instanceof ConfigError || !text ? null : rulesOnlyScan(text, incoming.sender);
    if (!fallback) throw error;
    console.error("Gemma indisponible, verdict par les règles seules", error);
    scan = fallback;
  }
  const memory = text ? before : similarReports(reports, scan.texteLu, chat.chatId);
  scan = applyMemory(scan, memory.people);
  const numero = normalizeNumber(scan.numero);
  const report: Report = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: incoming.source,
    chatId: chat.chatId,
    preview: (text || scan.texteLu).slice(0, 180),
    numero,
    verdict: scan.verdict,
    typeArnaque: scan.type,
    expediteur: scan.expediteur,
    montant: scan.montant,
    demande: scan.demande,
    lien: scan.lien,
    script: scan.type,
    raisons: scan.raisons,
    suiteArnaque: scan.suiteArnaque,
    messageSimple: scan.messageSimple,
    actions: adviceFor(scan.verdict, scan.type, scan.actions),
  };
  await addReport(report);
  const next = { ...chat, mode: "scanner" as const };
  await saveChat(next);

  const pub = { ...toPublic(report), similar: memory.people };
  return reply(next, formatReport(pub), pub);
}

export function formatReport(pub: PublicReport) {
  const lines = [`${headline(pub.verdict)} — ${pub.messageSimple}`];
  if (pub.montant) lines.push(`Montant lu : ${pub.montant}`);
  if (pub.raisons.length) {
    lines.push("", "Pourquoi :", ...pub.raisons.slice(0, 3).map((raison) => `• ${raison}`));
  }
  if (pub.suiteArnaque) lines.push("", `Suite probable : ${pub.suiteArnaque}`);
  if (pub.similar > 0) {
    lines.push("", `Un message très proche a déjà été signalé comme arnaque par ${pub.similar} personne${pub.similar > 1 ? "s" : ""}.`);
  }
  if (pub.heat) {
    lines.push("", `${heatLabel(pub.heat)} — signalé par ${pub.count} personne${pub.count > 1 ? "s" : ""} en 48 h.`);
  }
  if (pub.actions.length) lines.push("", "À faire :", ...pub.actions.map((action) => `• ${action}`));
  if (pub.verdict === "rouge") lines.push("", "Déjà payé ou donné ton code ? Envoie /victime.");
  return lines.join("\n");
}

export const MODE_TTL_MS = 2 * 60 * 60 * 1000;

function freshChat(chatId: string, now = Date.now()): ChatState {
  const chat = getChat(chatId);
  if (chat.mode === "scanner") return chat;
  const idle = now - new Date(chat.updatedAt).getTime();
  return idle > MODE_TTL_MS ? { ...chat, mode: "scanner", quizQuestion: "", quizAnswer: "" } : chat;
}

export async function handleMessage(incoming: Incoming): Promise<HandleResult> {
  const chat = freshChat(incoming.chatId);
  const text = incoming.text.trim();
  const command = text ? parseCommand(text) : null;

  try {
    if (command?.type === "menu") return reply(chat, menuText());
    if (command?.type === "conseils") return reply(chat, REFLEXES);
    if (command?.type === "victime") return reply(chat, VICTIM_STEPS);
    if (command?.type === "unknown") {
      return reply(chat, "Commande inconnue. Envoie / pour voir les options.");
    }
    if (command?.type === "stop") {
      const next = { ...chat, mode: "scanner" as const };
      await saveChat(next);
      return reply(next, "Retour au scanner. Envoie un SMS ou une capture.");
    }
    if (command?.type === "verifier") {
      const next = { ...chat, mode: "scanner" as const };
      await saveChat(next);
      return reply(next, "Envoie le SMS ou la capture.");
    }
    if (command?.type === "apprendre") {
      const next = {
        ...chat,
        mode: chat.courseText ? ("apprendre" as const) : ("attente_cours" as const),
      };
      await saveChat(next);
      return reply(
        next,
        next.mode === "apprendre"
          ? "Le cours est prêt.\n/plan — le calendrier\n/quiz — une question\n/resume — la fiche\n/stop — revenir aux arnaques\n\nEnvoie d'autres pages pour compléter le cours."
          : "Mode cours. Envoie ton texte ou une photo de tes notes.",
      );
    }
    if (command?.type === "plan") {
      if (!chat.courseText) return reply(chat, "Envoie d'abord un cours avec /apprendre.");
      if (!command.date) {
        const next = { ...chat, mode: "attente_date" as const };
        await saveChat(next);
        return reply(next, "Quelle est la date de l'examen ? Exemple : 12 novembre.");
      }
      const plan = await makePlan(chat.courseText, command.date, chat.weakTopics);
      const next = { ...chat, mode: "apprendre" as const, examDate: command.date };
      await saveChat(next);
      return reply(next, plan);
    }
    if (command?.type === "quiz") {
      if (!chat.courseText) return reply(chat, "Envoie d'abord un cours avec /apprendre.");
      const quiz = await makeQuiz(chat.courseText, chat.weakTopics);
      if (!quiz.question) return reply(chat, "Je n'ai pas réussi à poser une question. Réessaie /quiz.");
      const next = {
        ...chat,
        mode: "attente_quiz" as const,
        quizQuestion: quiz.question,
        quizAnswer: quiz.answer,
      };
      await saveChat(next);
      return reply(next, quiz.question);
    }
    if (command?.type === "resume") {
      if (!chat.courseText) return reply(chat, "Envoie d'abord un cours avec /apprendre.");
      const next = { ...chat, mode: "apprendre" as const };
      await saveChat(next);
      return reply(next, await makeResume(chat.courseText));
    }

    if (scamOverridesCourse(chat.mode, text)) {
      const result = await analyze({ ...chat, mode: "scanner" }, incoming);
      return {
        ...result,
        reply: `${result.reply}\n\n(J'ai lu ce message comme un SMS d'argent, pas comme ton cours. Le cours est gardé : /apprendre pour y revenir.)`,
      };
    }

    if (chat.mode === "attente_cours" || (chat.mode === "apprendre" && (incoming.image || text.length > 80))) {
      const extracted = await extractCourse(text, incoming.image);
      if (extracted.length < 20) {
        return reply(chat, "Je n'ai pas assez lu le cours. Renvoie un texte plus net.");
      }
      const adding = chat.mode === "apprendre" && chat.courseText;
      const courseText = adding ? `${chat.courseText}\n\n${extracted}`.slice(0, 16000) : extracted;
      const next = { ...chat, mode: "apprendre" as const, courseText };
      await saveChat(next);
      const truncated = adding && chat.courseText.length + extracted.length + 2 > 16000;
      return reply(
        next,
        [
          adding ? "Page ajoutée au cours." : "Cours reçu.",
          truncated ? "Le cours est long : je garde le début." : "",
          "/plan, /quiz, /resume, ou /stop pour le scanner.",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    if (chat.mode === "attente_date") {
      if (!text) return reply(chat, "Écris la date de l'examen. Exemple : 12 novembre.");
      const plan = await makePlan(chat.courseText, text, chat.weakTopics);
      const next = { ...chat, mode: "apprendre" as const, examDate: text };
      await saveChat(next);
      return reply(next, plan);
    }

    if (chat.mode === "attente_quiz") {
      if (!text) return reply(chat, "Écris ta réponse, ou /stop pour quitter.");
      const grade = await gradeQuiz(chat.quizQuestion, chat.quizAnswer, text);
      const weakTopics = grade.correct || !grade.notion
        ? chat.weakTopics
        : [...new Set([...chat.weakTopics, grade.notion])].slice(-8);
      const next = {
        ...chat,
        mode: "apprendre" as const,
        quizQuestion: "",
        quizAnswer: "",
        weakTopics,
      };
      await saveChat(next);
      return reply(next, grade.feedback || (grade.correct ? "Juste." : "À revoir. Envoie /quiz pour recommencer."));
    }

    if (chat.mode === "apprendre") {
      return reply(chat, "Tu es sur le cours. /plan, /quiz, /resume, ou /stop pour analyser un SMS.");
    }

    return await analyze(chat, incoming);
  } catch (error) {
    if (error instanceof ConfigError) return { ...reply(chat, error.message), failed: true };
    console.error("Traitement du message impossible", error);
    return {
      ...reply(chat, "Je n'ai pas pu lire ce message. Réessaie dans un instant. En attendant : ne renvoie rien et ne donne aucun code."),
      failed: true,
    };
  }
}
