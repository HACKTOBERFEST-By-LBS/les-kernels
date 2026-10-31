import fs from "fs";
import path from "path";
import type { ChatState, Report, StoreData } from "./types";

const file = path.join(process.cwd(), "data", "store.json");

const empty = (): StoreData => ({
  reports: [],
  chats: [],
  seenMessageIds: [],
});

function read(): StoreData {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<StoreData>;
    return {
      reports: (parsed.reports ?? []).map((report) => ({
        ...report,
        typeArnaque: report.typeArnaque ?? "autre",
        expediteur: report.expediteur ?? "",
      })),
      chats: parsed.chats ?? [],
      seenMessageIds: parsed.seenMessageIds ?? [],
    };
  } catch {
    return empty();
  }
}

function write(data: StoreData) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let chain: Promise<unknown> = Promise.resolve();

function update<T>(fn: (data: StoreData) => T): Promise<T> {
  const run = chain.then(() => {
    const data = read();
    const result = fn(data);
    write(data);
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function readStore() {
  return read();
}

export function getChat(chatId: string): ChatState {
  const found = read().chats.find((chat) => chat.chatId === chatId);
  return (
    found ?? {
      chatId,
      mode: "scanner",
      courseText: "",
      examDate: "",
      quizQuestion: "",
      quizAnswer: "",
      weakTopics: [],
      updatedAt: new Date().toISOString(),
    }
  );
}

export function saveChat(chat: ChatState) {
  return update((data) => {
    const index = data.chats.findIndex((item) => item.chatId === chat.chatId);
    const next = { ...chat, updatedAt: new Date().toISOString() };
    if (index >= 0) data.chats[index] = next;
    else data.chats.push(next);
    return next;
  });
}

export function addReport(report: Report) {
  return update((data) => {
    data.reports.push(report);
    return report;
  });
}

export function replaceDemoReports(reports: Report[]) {
  return update((data) => {
    data.reports = [
      ...data.reports.filter((report) => report.source !== "demo"),
      ...reports,
    ];
    return data.reports;
  });
}

export function hasSeen(messageId: string) {
  return read().seenMessageIds.includes(messageId);
}

export function markSeen(messageId: string) {
  return update((data) => {
    if (!data.seenMessageIds.includes(messageId)) {
      data.seenMessageIds.push(messageId);
    }
    if (data.seenMessageIds.length > 500) {
      data.seenMessageIds.splice(0, data.seenMessageIds.length - 500);
    }
  });
}
