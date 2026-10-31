"use client";

import { useState } from "react";
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

const MODE_LABEL: Record<ChatMode, string> = {
  scanner: "Scanner",
  attente_cours: "En attente du cours",
  apprendre: "Cours",
  attente_date: "Date d'examen",
  attente_quiz: "Quiz",
};

export default function HomePage() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ mimeType: string; data: string; name: string } | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [mode, setMode] = useState<ChatMode>("scanner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function currentChatId() {
    const key = "alerte-chat";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  }

  async function send(nextText = text, keepImage = true) {
    const shot = keepImage ? image : null;
    if (busy) return;
    if (!nextText.trim() && !shot) return;
    setBusy(true);
    setError("");
    const userText = nextText.trim() || `Capture : ${shot?.name ?? "image"}`;
    setBubbles((current) => [...current, { id: crypto.randomUUID(), role: "user", text: userText }]);
    setText("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: currentChatId(),
          text: nextText,
          imageBase64: shot?.data,
          mimeType: shot?.mimeType,
        }),
      });
      const result = (await response.json()) as HandleResult;
      setMode(result.mode);
      setBubbles((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "bot", text: result.reply, report: result.report, failed: result.failed },
      ]);
      setImage(null);
    } catch {
      setError("Le site n'a pas pu répondre. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <section className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-danger">Moov · T-Money</p>
        <h1 className="mt-2 font-serif text-5xl leading-none tracking-tight">Le message est-il vrai ?</h1>
        <p className="mt-4 max-w-xl text-lg leading-7 text-[#5c5348]">
          Colle un SMS, envoie une capture, ou tape <span className="font-semibold text-foreground">/</span> pour
          voir les options. Le mode cours ne s&apos;ouvre qu&apos;avec une commande.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-[28px] border border-line bg-card p-4 shadow-[0_20px_50px_rgba(80,50,20,0.05)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-[#5c5348]">Conversation</p>
            <span className="rounded-full bg-[#f3ecdf] px-3 py-1 text-xs font-semibold">{MODE_LABEL[mode]}</span>
          </div>
          <div className="flex min-h-80 flex-col gap-3">
            {bubbles.length === 0 ? (
              <p className="text-sm leading-6 text-[#5c5348]">
                Commence par un exemple, ou envoie /menu.
              </p>
            ) : null}
            {bubbles.map((bubble) => (
              <div key={bubble.id} className={bubble.role === "user" ? "ml-8" : "mr-8"}>
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
                {bubble.report ? (
                  <div className="mt-2">
                    <VerdictCard report={bubble.report} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={4}
              placeholder="Colle le SMS, ou écris /menu"
              className="w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-base outline-none focus:border-[#1d1914]"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-full border border-line px-4 py-2 text-sm">
                {image ? image.name : "Ajouter une capture"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const value = String(reader.result ?? "");
                      const [, data = ""] = value.split(",");
                      setImage({ mimeType: file.type || "image/jpeg", data, name: file.name });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy}
                className="rounded-full bg-[#9f1d1d] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Lecture…" : "Analyser"}
              </button>
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
        </section>

        <aside className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Exemples pour la démo</p>
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => setText(example.text)}
              className="rounded-2xl border border-line bg-card px-4 py-3 text-left text-sm hover:border-[#1d1914]"
            >
              {example.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void send("/menu", false)}
            className="rounded-2xl border border-dashed border-line px-4 py-3 text-left text-sm"
          >
            Afficher /menu
          </button>
        </aside>
      </div>
    </main>
  );
}
