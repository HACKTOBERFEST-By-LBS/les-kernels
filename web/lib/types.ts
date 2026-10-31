export type Verdict = "vert" | "orange" | "rouge";

export type Heat = "vu" | "revient" | "arnaqueur";

export type ScamType =
  | "depot_par_erreur"
  | "faux_gain"
  | "faux_agent"
  | "demande_code"
  | "lien_piege"
  | "banque_bloquee"
  | "faux_colis"
  | "faux_emploi"
  | "faux_pret"
  | "urgence_proche"
  | "autre"
  | "aucune";

export type ChatMode =
  | "scanner"
  | "attente_cours"
  | "apprendre"
  | "attente_date"
  | "attente_quiz";

export type Source = "web" | "whatsapp" | "demo";

export type Scan = {
  verdict: Verdict;
  type: ScamType;
  expediteur: string;
  texteLu: string;
  numero: string;
  montant: string;
  demande: string;
  lien: string;
  raisons: string[];
  suiteArnaque: string;
  messageSimple: string;
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
  typeArnaque: ScamType;
  expediteur: string;
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
  typeArnaque: ScamType;
  expediteur: string;
  numero: string;
  montant: string;
  lien: string;
  raisons: string[];
  suiteArnaque: string;
  messageSimple: string;
  actions: string[];
  heat: Heat | null;
  count: number;
  similar: number;
};

export type HandleResult = {
  reply: string;
  mode: ChatMode;
  report: PublicReport | null;
  failed?: boolean;
};
