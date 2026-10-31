import { menuText, parseCommand } from "./commands";
import {
  extractCourse,
  gradeQuiz,
  makePlan,
  makeQuiz,
  makeResume,
  scanMessage,
} from "./gemma";
import { heatFor, heatLabel, normalizeNumber, recentRedReports } from "./reputation";
import { addReport, getChat, readStore, saveChat } from "./store";
import type { ChatState, HandleResult, PublicReport, Report, Source } from "./types";

type Incoming = {
  chatId: string;
  text: string;
  image?: { mimeType: string; data: string };
  source: Exclude<Source, "demo">;
};

function reply(chat: ChatState, text: string, report: PublicReport | null = null): HandleResult {
  return { reply: text, mode: chat.mode, report };
}

function countFor(numero: string) {
  const normalized = normalizeNumber(numero);
  if (!normalized) return 0;
  return recentRedReports(readStore().reports).filter(
    (report) => normalizeNumber(report.numero) === normalized,
  ).length;
}

function toPublic(report: Report): PublicReport {
  const count = countFor(report.numero);
  return {
    verdict: report.verdict,
    numero: normalizeNumber(report.numero),
    montant: report.montant,
    demande: report.demande,
    lien: report.lien,
    script: report.script,
    raisons: report.raisons,
    suiteArnaque: report.suiteArnaque,
    messageSimple: report.messageSimple,
    actions: report.actions,
    heat: report.verdict === "rouge" ? heatFor(count) : null,
    count,
  };
}

async function analyze(chat: ChatState, incoming: Incoming): Promise<HandleResult> {
  const text = incoming.text.trim();
  if (!text && !incoming.image) {
    return reply(chat, "Envoie le SMS ou la capture.");
  }

  const scan = await scanMessage(text, incoming.image);
  const numero = normalizeNumber(scan.numero);
  const report: Report = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: incoming.source,
    chatId: chat.chatId,
    preview: text.slice(0, 180),
    numero,
    verdict: scan.verdict,
    montant: scan.montant,
    demande: scan.demande,
    lien: scan.lien,
    script: scan.script,
    raisons: scan.raisons,
    suiteArnaque: scan.suite_arnaque,
    messageSimple: scan.message_simple,
    actions: scan.actions,
  };
  await addReport(report);
  const next = { ...chat, mode: "scanner" as const };
  await saveChat(next);

  const pub = toPublic(report);
  const lines = [pub.messageSimple || "Message lu."];
  if (pub.suiteArnaque) lines.push("", `Suite probable : ${pub.suiteArnaque}`);
  if (pub.heat) lines.push("", `${heatLabel(pub.heat)} — ${pub.count} signalement${pub.count > 1 ? "s" : ""} en 48 h.`);
  if (pub.actions.length) lines.push("", pub.actions.map((action) => `• ${action}`).join("\n"));
  return reply(next, lines.filter((line) => line !== undefined).join("\n"), pub);
}

export async function handleMessage(incoming: Incoming): Promise<HandleResult> {
  const chat = getChat(incoming.chatId);
  const text = incoming.text.trim();
  const command = text ? parseCommand(text) : null;

  try {
    if (command?.type === "menu") return reply(chat, menuText());
    if (command?.type === "unknown") {
      return reply(chat, "Commande inconnue. Envoie / pour voir les options.");
    }
    if (command?.type === "stop") {
      const next = { ...chat, mode: "scanner" as const };
      await saveChat(next);
      return reply(next, "Retour au scanner. Envoie un SMS ou une capture.");
    }
    if (command?.type === "verifier") {
      const next = { ...chat, mode: "attente_message" as const };
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
          ? "Le cours est prêt.\n/plan — le calendrier\n/quiz — une question\n/resume — la fiche\n/stop — revenir aux arnaques\n\nTu peux aussi envoyer un nouveau cours."
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

    if (chat.mode === "attente_cours" || (chat.mode === "apprendre" && (incoming.image || text.length > 80))) {
      const courseText = await extractCourse(text, incoming.image);
      if (courseText.length < 20) {
        return reply(chat, "Je n'ai pas assez lu le cours. Renvoie un texte plus net.");
      }
      const next = { ...chat, mode: "apprendre" as const, courseText };
      await saveChat(next);
      return reply(next, "Cours reçu. /plan, /quiz, /resume, ou /stop pour le scanner.");
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
    const message = error instanceof Error ? error.message : "Le service a échoué.";
    return reply(chat, message);
  }
}
