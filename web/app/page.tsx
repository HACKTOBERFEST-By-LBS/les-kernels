"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { VerdictCard } from "@/components/verdict-card";
import { EXAMPLES } from "@/lib/examples";
import type { ChatMode, HandleResult, PublicReport } from "@/lib/types";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOfflineSnapshot() {
  return !navigator.onLine;
}

function getServerOfflineSnapshot() {
  return false;
}

type Bubble = {
  id: string;
  role: "user" | "bot";
  sender?: string;
  text: string;
  report?: PublicReport | null;
  failed?: boolean;
};

type Attachment = { mimeType: string; data: string; name: string };

const MODE_META: Record<
  ChatMode,
  {
    badge: string;
    title: string;
    instruction: string;
    inputLabel: string;
    placeholder: string;
    submitLabel: string;
  }
> = {
  scanner: {
    badge: "Scanner anti-arnaque actif",
    title: "Ce SMS Mobile Money est-il vrai ?",
    instruction:
      "Collez le SMS reçu ou ajoutez sa capture d'écran. Vous obtenez immédiatement un verdict clair : ARNAQUE, DOUTEUX ou NORMAL.",
    inputLabel: "2. Texte du SMS ou message reçu",
    placeholder: "Collez ici le texte exact du SMS reçu (ou choisissez un exemple à droite)...",
    submitLabel: "Vérifier ce message",
  },
  attente_cours: {
    badge: "Mode cours : étape 1 sur 2",
    title: "Envoyez votre cours à réviser",
    instruction:
      "Collez le texte de vos notes ou joignez une photo / un PDF de votre cours. Si vous recevez un SMS suspect entre-temps, collez-le : il sera quand même vérifié.",
    inputLabel: "Texte du cours (ou fichier joint ci-dessous)",
    placeholder: "Collez ici votre chapitre de cours, vos notes, ou ajoutez une photo / un PDF...",
    submitLabel: "Enregistrer ce cours",
  },
  apprendre: {
    badge: "Mode cours : prêt à réviser",
    title: "Votre cours est enregistré",
    instruction:
      "Utilisez les boutons ci-dessous pour générer une fiche de révision, répondre à un quiz ou créer votre plan jusqu'à l'examen.",
    inputLabel: "Ajouter une page au cours ou poser une commande",
    placeholder: "Collez une autre page de cours pour l'ajouter, ou cliquez sur Fiche / Quiz / Plan...",
    submitLabel: "Envoyer au cours",
  },
  attente_date: {
    badge: "Mode cours : date d'examen",
    title: "Quelle est la date de votre examen ?",
    instruction:
      "Indiquez le jour de votre examen pour obtenir un plan de révision jour par jour à partir d'aujourd'hui.",
    inputLabel: "Date de l'examen",
    placeholder: "Exemple : 12 novembre",
    submitLabel: "Créer mon calendrier de révision",
  },
  attente_quiz: {
    badge: "Mode cours : question en cours",
    title: "Répondez à la question du quiz",
    instruction:
      "Écrivez votre réponse en une ou deux phrases. Elle sera corrigée immédiatement à partir de votre cours.",
    inputLabel: "Votre réponse à la question",
    placeholder: "Écrivez votre réponse ici...",
    submitLabel: "Valider ma réponse",
  },
};

const SENDER_PRESETS = [
  { label: "TMONEY", value: "TMONEY", hint: "Nom officiel" },
  { label: "MOOV", value: "MOOV", hint: "Nom officiel" },
  { label: "Numéro +228...", value: "+228 ", hint: "Numéro privé" },
  { label: "Inconnu", value: "", hint: "Non visible" },
] as const;

const MAX_SIDE = 1600;
const MAX_PDF_BYTES = 4_000_000;

function chatId() {
  const key = "alerte-chat";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

function readAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function shrinkImage(file: File): Promise<Attachment> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { mimeType: "image/jpeg", data: dataUrl.split(",")[1] ?? "", name: file.name };
}

async function toAttachment(file: File): Promise<Attachment> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error("Ce fichier PDF dépasse 4 Mo. Choisissez un PDF plus léger ou prenez une photo de la page.");
    }
    const dataUrl = await readAsDataUrl(file);
    return { mimeType: file.type, data: dataUrl.split(",")[1] ?? "", name: file.name };
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Format non pris en charge. Choisissez une image (capture, photo) ou un document PDF.");
  }
  try {
    return await shrinkImage(file);
  } catch {
    const dataUrl = await readAsDataUrl(file);
    return { mimeType: file.type || "image/jpeg", data: dataUrl.split(",")[1] ?? "", name: file.name };
  }
}

export default function HomePage() {
  const [text, setText] = useState("");
  const [sender, setSender] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [mode, setMode] = useState<ChatMode>("scanner");
  const [modeLoaded, setModeLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const offline = useSyncExternalStore(
    subscribeOnline,
    getOfflineSnapshot,
    getServerOfflineSnapshot,
  );
  const [notice, setNotice] = useState("");
  const sending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/chat?chatId=${encodeURIComponent(chatId())}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { mode?: ChatMode } | null) => {
        if (!cancelled) {
          if (body?.mode) setMode(body.mode);
          setModeLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setModeLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function send(
    nextText = text,
    options?: { withAttachment?: boolean; overrideSender?: string; clearFormOnSuccess?: boolean },
  ) {
    const withAttachment = options?.withAttachment ?? true;
    const activeSender = options?.overrideSender !== undefined ? options.overrideSender : withAttachment ? sender : "";
    const clearForm = options?.clearFormOnSuccess ?? withAttachment;
    const file = withAttachment ? attachment : null;

    if (sending.current) return;
    if (!nextText.trim() && !file) {
      setError("Collez un message texte ou ajoutez une capture d'écran avant de lancer la vérification.");
      textareaRef.current?.focus();
      return;
    }

    sending.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    const userText = nextText.trim() || `Fichier joint : ${file?.name ?? "capture"}`;
    const userBubbleId = crypto.randomUUID();
    setBubbles((current) => [
      ...current,
      { id: userBubbleId, role: "user", sender: activeSender.trim() || undefined, text: userText },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chatId(),
          text: nextText,
          sender: activeSender,
          imageBase64: file?.data,
          mimeType: file?.mimeType,
        }),
      });
      const result = (await response.json()) as HandleResult;
      setMode(result.mode);
      setBubbles((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "bot",
          text: result.reply,
          report: result.report,
          failed: result.failed,
        },
      ]);
      if (response.ok && clearForm) {
        setText("");
        setAttachment(null);
        setSender("");
        if (fileInput.current) fileInput.current.value = "";
      }
      window.setTimeout(() => {
        conversationTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } catch {
      setError(
        "Impossible de joindre le serveur. Votre message n'a pas été effacé : vérifiez votre connexion Internet et appuyez à nouveau sur le bouton.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  function loadExampleIntoForm(example: (typeof EXAMPLES)[number]) {
    setText(example.text);
    setSender(example.sender);
    setError("");
    setNotice(`Exemple « ${example.label} » copié dans le formulaire. Appuyez sur « Vérifier ce message ».`);
    textareaRef.current?.focus();
  }

  function runExampleImmediately(example: (typeof EXAMPLES)[number]) {
    setText(example.text);
    setSender(example.sender);
    void send(example.text, {
      withAttachment: false,
      overrideSender: example.sender,
      clearFormOnSuccess: true,
    });
  }

  const currentMeta = MODE_META[mode];
  const isCourseMode = mode !== "scanner";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {offline ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-warn bg-warn-soft px-4 py-3 text-sm font-semibold text-foreground"
        >
          <span>
            Connexion Internet coupée. Vous pouvez préparer votre message, mais l&apos;analyse nécessite le réseau.
          </span>
          <Link
            href="/numeros"
            className="inline-flex min-h-11 items-center rounded-lg border border-foreground bg-card px-3 py-1.5 text-xs font-bold text-foreground"
          >
            Consulter les numéros signalés
          </Link>
        </div>
      ) : null}

      {isCourseMode ? (
        <section
          aria-label="Mode cours actif"
          className="flex flex-col gap-3 rounded-xl border-2 border-brand bg-brand-soft p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-brand px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-white">
                {currentMeta.badge}
              </span>
              <span className="text-xs font-semibold text-brand-ink">
                Un SMS d&apos;argent collé ici reste analysé en priorité.
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-foreground">{currentMeta.instruction}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("/resume", { withAttachment: false })}
                className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:border-foreground disabled:opacity-60"
              >
                Obtenir la fiche (/resume)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("/quiz", { withAttachment: false })}
                className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:border-foreground disabled:opacity-60"
              >
                Lancer une question (/quiz)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("/plan", { withAttachment: false })}
                className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:border-foreground disabled:opacity-60"
              >
                Planifier avant l&apos;examen (/plan)
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void send("/stop", { withAttachment: false })}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-foreground px-4 py-2.5 text-xs font-bold text-card hover:opacity-90 disabled:opacity-60"
          >
            Quitter le cours et revenir au scanner
          </button>
        </section>
      ) : null}

      <header className="flex flex-col gap-2 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-line-strong bg-card px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              {modeLoaded ? currentMeta.badge : "Synchronisation..."}
            </span>
            <span className="font-mono text-xs font-semibold text-muted">
              T-Money · Moov Money · Banques · Gains
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {currentMeta.title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-muted">
            {currentMeta.instruction}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/numeros"
            className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:border-foreground"
          >
            Voir les numéros signalés
          </Link>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <section
            aria-label="Formulaire de vérification"
            className={`rounded-xl border border-line-strong bg-card p-4 shadow-xs sm:p-6 ${bubbles.length > 0 || busy ? "order-2" : ""}`}
          >
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              {!isCourseMode ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <label htmlFor="sender-input" className="text-sm font-bold text-foreground">
                      1. Qui a envoyé ce SMS ? <span className="font-normal text-muted">(recommandé)</span>
                    </label>
                    <span className="text-xs text-muted">
                      Un vrai avis T-Money ou Moov ne vient jamais d&apos;un numéro +228.
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choix rapide de l'expéditeur">
                    {SENDER_PRESETS.map((preset) => {
                      const selected =
                        preset.value === "+228 "
                          ? sender.startsWith("+228")
                          : sender.toUpperCase() === preset.value;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setSender(preset.value);
                            setNotice("");
                          }}
                          className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${
                            selected
                              ? "border-foreground bg-foreground text-card"
                              : "border-line bg-background text-foreground hover:border-foreground"
                          }`}
                        >
                          <span className="font-mono">{preset.label}</span>
                          <span className={selected ? "text-card/80 font-normal" : "text-muted font-normal"}>
                            ({preset.hint})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    id="sender-input"
                    value={sender}
                    onChange={(event) => setSender(event.target.value)}
                    placeholder="Ex. : TMONEY, MOOV, MABANQUE ou +228 90 00 00 00"
                    className="min-h-11 w-full rounded-lg border border-line-strong bg-background px-3.5 font-mono text-sm text-foreground outline-none focus:border-foreground focus:bg-card focus:ring-2 focus:ring-foreground"
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="sms" className="text-sm font-bold text-foreground">
                    {currentMeta.inputLabel}
                  </label>
                  {text || sender || attachment ? (
                    <button
                      type="button"
                      onClick={() => {
                        setText("");
                        setSender("");
                        setAttachment(null);
                        setError("");
                        setNotice("");
                        if (fileInput.current) fileInput.current.value = "";
                        textareaRef.current?.focus();
                      }}
                      className="inline-flex min-h-9 items-center rounded-md px-2.5 text-xs font-semibold text-muted underline hover:text-foreground"
                    >
                      Vider le formulaire
                    </button>
                  ) : null}
                </div>

                <textarea
                  ref={textareaRef}
                  id="sms"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={(event) => {
                    const touch = window.matchMedia("(pointer: coarse)").matches;
                    if (event.key === "Enter" && !event.shiftKey && !touch) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                  rows={4}
                  placeholder={currentMeta.placeholder}
                  className="w-full resize-y rounded-lg border border-line-strong bg-background px-3.5 py-3 text-base leading-relaxed text-foreground outline-none focus:border-foreground focus:bg-card focus:ring-2 focus:ring-foreground"
                />
              </div>

              {attachment ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand bg-brand-soft px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-md bg-brand px-2 py-0.5 font-mono text-xs font-bold uppercase text-white">
                      {attachment.mimeType === "application/pdf" ? "PDF" : "IMAGE"}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{attachment.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(null);
                      if (fileInput.current) fileInput.current.value = "";
                    }}
                    className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:border-foreground"
                  >
                    Retirer ce fichier
                  </button>
                </div>
              ) : null}

              {notice ? (
                <p role="status" className="rounded-lg border border-line-strong bg-background px-3.5 py-2 text-xs font-semibold text-foreground">
                  {notice}
                </p>
              ) : null}

              {error ? (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-danger bg-danger-soft px-3.5 py-3 text-sm font-semibold text-danger"
                >
                  <span>{error}</span>
                  {text.trim() || attachment ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void send()}
                      className="inline-flex min-h-11 items-center rounded-lg bg-danger px-3.5 py-1.5 text-xs font-bold text-white"
                    >
                      Réessayer maintenant
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <label className="relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line-strong bg-background px-4 py-2.5 text-sm font-bold text-foreground hover:border-foreground focus-within:ring-2 focus-within:ring-foreground">
                  <span>
                    {attachment ? "Changer la capture ou le PDF" : "Joindre une capture d'écran ou un PDF"}
                  </span>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*,application/pdf"
                    className="sr-only"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        setAttachment(await toAttachment(file));
                        setError("");
                        setNotice("");
                      } catch (reason) {
                        setError(reason instanceof Error ? reason.message : "Fichier illisible.");
                      }
                    }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-danger px-6 py-3 text-base font-extrabold text-white shadow-xs hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-60"
                >
                  {busy ? "Analyse en cours..." : currentMeta.submitLabel}
                </button>
              </div>
            </form>
          </section>

          <section
            ref={conversationTopRef}
            aria-label="Résultats et historique de la session"
            className={`scroll-mt-4 rounded-xl border border-line bg-card p-4 shadow-xs sm:p-6 ${bubbles.length > 0 || busy ? "order-1" : ""}`}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <h2 className="text-base font-extrabold text-foreground">
                  Relevé des vérifications et réponses
                </h2>
                <p className="text-xs text-muted">
                  {bubbles.length === 0
                    ? "Aucun message analysé dans cette session."
                    : `${Math.ceil(bubbles.length / 2)} échange${Math.ceil(bubbles.length / 2) > 1 ? "s" : ""} affiché${Math.ceil(bubbles.length / 2) > 1 ? "s" : ""}`}
                </p>
              </div>
              {bubbles.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setBubbles([]);
                    setError("");
                    setNotice("");
                  }}
                  className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:border-foreground"
                >
                  Effacer l&apos;historique affiché
                </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-4" aria-live="polite">
              {bubbles.length === 0 && !busy ? (
                <div className="rounded-xl border border-dashed border-line-strong bg-background p-5">
                  <p className="text-sm font-bold text-foreground">
                    Prêt à contrôler un SMS. Comment commencer ?
                  </p>
                  <ol className="mt-2 space-y-1.5 text-sm text-muted">
                    <li>1. Indiquez l&apos;expéditeur du message (TMONEY, MOOV ou le numéro +228).</li>
                    <li>2. Collez le SMS reçu ou joignez sa capture d&apos;écran ci-dessus.</li>
                    <li>
                      3. Ou cliquez sur un des <strong>4 exemples prêts à tester</strong> dans la colonne de droite.
                    </li>
                  </ol>
                </div>
              ) : null}

              {bubbles.map((bubble) => (
                <div key={bubble.id} className="flex flex-col gap-1.5">
                  {bubble.role === "user" ? (
                    <div className="ml-auto max-w-2xl rounded-xl border border-line-strong bg-surface-alt px-4 py-3 text-foreground">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                        <span>Message envoyé pour contrôle</span>
                        {bubble.sender ? (
                          <span className="rounded bg-card px-2 py-0.5 font-mono text-foreground">
                            Expéditeur : {bubble.sender}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{bubble.text}</p>
                    </div>
                  ) : bubble.report ? (
                    <VerdictCard
                      report={bubble.report}
                      onVictimAction={() => void send("/victime", { withAttachment: false })}
                    />
                  ) : (
                    <div
                      className={` rounded-xl border px-4 py-3.5 text-sm leading-relaxed ${
                        bubble.failed
                          ? "border-2 border-danger bg-danger-soft font-semibold text-danger"
                          : "border-line-strong bg-background text-foreground"
                      }`}
                    >
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                        {bubble.failed ? "Erreur de lecture" : "Réponse d'Alerte Marché"}
                      </p>
                      <p className="whitespace-pre-wrap">{bubble.text}</p>
                    </div>
                  )}
                </div>
              ))}

              {busy ? (
                <div
                  role="status"
                  aria-label="Analyse du message en cours"
                  className="rounded-xl border-2 border-line-strong bg-background p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center rounded-md bg-foreground px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-card">
                      Vérification en cours...
                    </span>
                    <span className="font-mono text-xs font-semibold text-muted">
                      Règles fixes + Gemma
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    Inspection de l&apos;expéditeur, du montant, des liens et de la mémoire collective...
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="h-10 rounded-lg bg-surface-alt" />
                    <div className="h-10 rounded-lg bg-surface-alt" />
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside aria-label="Exemples de SMS et outils d'aide" className="flex flex-col gap-5">
          <section className="rounded-xl border border-line bg-card p-4 shadow-xs">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
              Tester avec un SMS d&apos;exemple
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Appuyez sur « Tester » pour lancer l&apos;analyse en 1 seconde, ou sur « Pré-remplir » pour modifier le texte avant l&apos;envoi.
            </p>
            <div className="mt-3 flex flex-col gap-2.5">
              {EXAMPLES.map((example) => {
                const isOfficial = example.sender === "TMONEY";
                return (
                  <div
                    key={example.label}
                    className="flex flex-col gap-2 rounded-lg border border-line bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{example.label}</span>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                          isOfficial
                            ? "border border-safe-border bg-safe-soft text-safe"
                            : "border border-danger-border bg-danger-soft text-danger"
                        }`}
                      >
                        {example.sender}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted">{example.text}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => runExampleImmediately(example)}
                        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-foreground px-3 py-1.5 text-xs font-bold text-card hover:opacity-90 disabled:opacity-60"
                      >
                        Tester tout de suite
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => loadExampleIntoForm(example)}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:border-foreground disabled:opacity-60"
                      >
                        Pré-remplir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-line bg-card p-4 shadow-xs">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
              Urgence &amp; Protection
            </h2>
            <div className="mt-3 flex flex-col gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("/victime", { withAttachment: false })}
                className="flex min-h-11 w-full items-center justify-between rounded-lg border-2 border-danger bg-danger-soft px-3.5 py-2.5 text-left text-xs font-extrabold text-danger hover:bg-danger hover:text-white disabled:opacity-60"
              >
                <span>J&apos;ai déjà payé ou donné mon code</span>
                <span className="font-mono uppercase">Urgence</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("/conseils", { withAttachment: false })}
                className="flex min-h-11 w-full items-center justify-between rounded-lg border border-line-strong bg-background px-3.5 py-2.5 text-left text-xs font-bold text-foreground hover:border-foreground disabled:opacity-60"
              >
                <span>Les 5 réflexes anti-arnaque</span>
                <span className="font-mono text-muted">/conseils</span>
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-card p-4 shadow-xs">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
              Volet étudiant (Révision)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Envoyez un cours (texte, photo ou PDF) pour créer une fiche, un quiz ou un calendrier de révision.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {!isCourseMode ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send("/apprendre", { withAttachment: false })}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg border border-line-strong bg-background px-3.5 py-2.5 text-left text-xs font-bold text-foreground hover:border-foreground disabled:opacity-60"
                >
                  <span>Ouvrir le mode révision de cours</span>
                  <span className="font-mono text-muted">/apprendre</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send("/stop", { withAttachment: false })}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg bg-foreground px-3.5 py-2.5 text-left text-xs font-bold text-card hover:opacity-90 disabled:opacity-60"
                >
                  <span>Quitter le cours (retour au scanner)</span>
                  <span className="font-mono">/stop</span>
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void send("/menu", { withAttachment: false })}
                className="flex min-h-11 w-full items-center justify-between rounded-lg border border-dashed border-line-strong px-3.5 py-2 text-left text-xs font-semibold text-muted hover:border-foreground hover:text-foreground disabled:opacity-60"
              >
                <span>Voir toutes les commandes WhatsApp</span>
                <span className="font-mono">/menu</span>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
