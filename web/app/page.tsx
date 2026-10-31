"use client";

import { useEffect, useRef, useState } from "react";
import { VerdictCard } from "@/components/verdict-card";
import { EXAMPLES } from "@/lib/examples";
import type { ChatMode, HandleResult, PublicReport } from "@/lib/types";

type Bubble = {
  id: string;
  role: "user" | "bot";
  text: string;
  report?: PublicReport | null;
  failed?: boolean;
};

type Attachment = { mimeType: string; data: string; name: string };

const MODE_LABEL: Record<ChatMode, string> = {
  scanner: "Scanner",
  attente_cours: "En attente du cours",
  apprendre: "Cours",
  attente_date: "Date d'examen",
  attente_quiz: "Quiz",
};

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
    if (file.size > MAX_PDF_BYTES) throw new Error("PDF trop lourd (4 Mo maximum).");
    const dataUrl = await readAsDataUrl(file);
    return { mimeType: file.type, data: dataUrl.split(",")[1] ?? "", name: file.name };
  }
  if (!file.type.startsWith("image/")) throw new Error("Choisis une image ou un PDF.");
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/chat?chatId=${encodeURIComponent(chatId())}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { mode?: ChatMode } | null) => {
        if (!cancelled && body?.mode) setMode(body.mode);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function send(nextText = text, withAttachment = true) {
    const file = withAttachment ? attachment : null;
    if (sending.current) return;
    if (!nextText.trim() && !file) return;
    sending.current = true;
    setBusy(true);
    setError("");
    const userText = nextText.trim() || `Fichier : ${file?.name ?? "capture"}`;
    setBubbles((current) => [...current, { id: crypto.randomUUID(), role: "user", text: userText }]);
    setText("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chatId(),
          text: nextText,
          sender: withAttachment ? sender : "",
          imageBase64: file?.data,
          mimeType: file?.mimeType,
        }),
      });
      const result = (await response.json()) as HandleResult;
      setMode(result.mode);
      setBubbles((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "bot", text: result.reply, report: result.report, failed: result.failed },
      ]);
      if (response.ok) {
        setAttachment(null);
        setSender("");
        if (fileInput.current) fileInput.current.value = "";
      }
    } catch {
      setError("Le site n'a pas pu répondre. Vérifie la connexion et réessaie.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <section className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-danger">Moov · T-Money</p>
        <h1 className="mt-2 font-serif text-4xl leading-none tracking-tight sm:text-5xl">Le message est-il vrai ?</h1>
        <p className="mt-4 max-w-xl text-lg leading-7 text-[#5c5348]">
          Colle un SMS, envoie une capture, ou tape <span className="font-semibold text-foreground">/</span> pour
          voir les options. Le mode cours ne s&apos;ouvre qu&apos;avec une commande.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-[28px] border border-line bg-card p-4 shadow-[0_20px_50px_rgba(80,50,20,0.05)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm text-[#5c5348]">Conversation</h2>
            <span className="rounded-full bg-[#f3ecdf] px-3 py-1 text-xs font-semibold">{MODE_LABEL[mode]}</span>
          </div>
          <div className="flex min-h-80 flex-col gap-3" aria-live="polite">
            {bubbles.length === 0 ? (
              <p className="text-sm leading-6 text-[#5c5348]">Commence par un exemple, ou envoie /menu.</p>
            ) : null}
            {bubbles.map((bubble) => (
              <div key={bubble.id} className={bubble.role === "user" ? "ml-8" : "mr-8"}>
                {bubble.report ? (
                  <VerdictCard report={bubble.report} />
                ) : (
                  <p
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                      bubble.role === "user"
                        ? "bg-[#1d1914] text-[#f3ecdf]"
                        : bubble.failed
                          ? "border border-[#9f1d1d] bg-[#fde8e4] text-[#7f1d1d]"
                          : "bg-[#f6f0e6]"
                    }`}
                  >
                    {bubble.text}
                  </p>
                )}
              </div>
            ))}
            {busy ? <p className="text-sm text-[#5c5348]">Lecture en cours…</p> : null}
          </div>

          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label htmlFor="sms" className="sr-only">
              Texte du SMS ou commande
            </label>
            <textarea
              id="sms"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                const touch = window.matchMedia("(pointer: coarse)").matches;
                if (event.key === "Enter" && !event.shiftKey && !touch) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={4}
              placeholder="Colle le SMS, ou écris /menu"
              className="w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-base outline-none focus:border-[#1d1914] focus-visible:ring-2 focus-visible:ring-[#1d1914]"
            />
            <label className="flex flex-col gap-1 text-sm text-[#5c5348]">
              Expéditeur du SMS (facultatif)
              <input
                value={sender}
                onChange={(event) => setSender(event.target.value)}
                placeholder="TMONEY, MOOV, ou un numéro"
                className="min-h-11 rounded-full border border-line bg-white px-4 text-base text-foreground outline-none focus:border-[#1d1914]"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 py-2 text-sm focus-within:ring-2 focus-within:ring-[#1d1914]">
                {attachment ? attachment.name : "Ajouter une capture ou un PDF"}
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
                    } catch (reason) {
                      setError(reason instanceof Error ? reason.message : "Fichier illisible.");
                    }
                  }}
                />
              </label>
              {attachment ? (
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                  className="min-h-11 rounded-full px-3 text-sm underline"
                >
                  Retirer
                </button>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="min-h-11 rounded-full bg-[#9f1d1d] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Lecture…" : "Analyser"}
              </button>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
          </form>
        </section>

        <aside className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Exemples pour la démo</h2>
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => {
                setText(example.text);
                setSender(example.sender);
              }}
              className="min-h-11 rounded-2xl border border-line bg-card px-4 py-3 text-left text-sm hover:border-[#1d1914]"
            >
              {example.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void send("/menu", false)}
            className="min-h-11 rounded-2xl border border-dashed border-line px-4 py-3 text-left text-sm"
          >
            Afficher /menu
          </button>
        </aside>
      </div>
    </main>
  );
}
