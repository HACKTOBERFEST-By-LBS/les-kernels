export type Verdict = "vert" | "orange" | "rouge";

export type Heat = "vu" | "revient" | "arnaqueur";

export type ChatMode =
  | "scanner"
  | "attente_message"
  | "attente_cours"
  | "apprendre"
  | "attente_date"
  | "attente_quiz";

export type Source = "web" | "whatsapp" | "demo";

export type Scan = {
  verdict: Verdict;
  numero: string;
  montant: string;
  demande: string;
  lien: string;
  script: string;
  raisons: string[];
  suite_arnaque: string;
  message_simple: string;
  actions: string[];
};

export type Report = {
  id: string;
  createdAt: string;
  source: Source;
  chatId: string;
  preview: string;
  numero: string;
  verdict: Verdict;
  montant: string;
  demande: string;
  lien: string;
  script: string;
  raisons: string[];
  suiteArnaque: string;
  messageSimple: string;
  actions: string[];
};

export type ChatState = {
  chatId: string;
  mode: ChatMode;
  courseText: string;
  examDate: string;
  quizQuestion: string;
  quizAnswer: string;
  weakTopics: string[];
  updatedAt: string;
};

export type StoreData = {
  reports: Report[];
  chats: ChatState[];
  seenMessageIds: string[];
};

export type PublicReport = {
  verdict: Verdict;
  numero: string;
  montant: string;
  demande: string;
  lien: string;
  script: string;
  raisons: string[];
  suiteArnaque: string;
  messageSimple: string;
  actions: string[];
  heat: Heat | null;
  count: number;
};

export type HandleResult = {
  reply: string;
  mode: ChatMode;
  report: PublicReport | null;
};
