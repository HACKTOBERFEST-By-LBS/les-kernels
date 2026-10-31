"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { headline } from "@/lib/rules";
import type { Report } from "@/lib/types";

type Session =
  | { reachable: false; detail?: string }
  | { reachable: true; ok: boolean; connected: boolean; ready: boolean; qr: string | null };

type AdminReport = Pick<Report, "id" | "createdAt" | "source" | "verdict" | "typeArnaque" | "numero" | "messageSimple">;

function qrSrc(qr: string) {
  if (qr.startsWith("data:image")) return qr;
  if (/^[A-Za-z0-9+/=]+$/.test(qr) && qr.length > 100) return `data:image/png;base64,${qr}`;
  return null;
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);

  useEffect(() => {
    let stop = false;

    async function load() {
      try {
        const [sessionResponse, reportsResponse] = await Promise.all([
          fetch("/api/admin/session", { cache: "no-store" }),
          fetch("/api/reports", { cache: "no-store" }),
        ]);
        if (stop) return;
        setSession((await sessionResponse.json()) as Session);
        const body = (await reportsResponse.json()) as { reports: AdminReport[] };
        setReports(body.reports);
      } catch {
        if (!stop) setSession({ reachable: false, detail: "Le site ne répond pas." });
      }
    }

    const first = window.setTimeout(() => {
      void load();
    }, 0);
    const timer = window.setInterval(() => void load(), 4000);
    return () => {
      stop = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const ready = session?.reachable && session.ready;
  const image = session?.reachable && session.qr ? qrSrc(session.qr) : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="font-serif text-4xl tracking-tight">Admin du numéro</h1>
        <p className="mt-2 max-w-2xl text-[#5c5348]">
          Un seul numéro WhatsApp, relié par QR. Les gens écrivent à ce numéro.{" "}
          <span className="font-semibold text-foreground">/</span> affiche les options.
        </p>
      </div>

      <section className="rounded-3xl border border-line bg-card p-5">
        <p className="text-sm uppercase tracking-[0.14em] text-[#5c5348]">Session OpenWA</p>
        <p className="mt-2 text-2xl font-semibold">
          {!session ? "Lecture…" : ready ? "Numéro connecté" : session.reachable ? "En attente du QR" : "OpenWA arrêté"}
        </p>
        {session && !session.reachable ? (
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#5c5348]">
            {session.detail} Lance OpenWA avec Docker, ou depuis le dossier openwa, puis scanne le QR avec le
            numéro de l&apos;équipe. Le scanner du site marche déjà sans WhatsApp.
          </p>
        ) : null}
        {image ? (
          <Image
            src={image}
            alt="QR code WhatsApp"
            width={256}
            height={256}
            unoptimized
            className="mt-4 h-64 w-64 rounded-2xl bg-white p-3"
          />
        ) : null}
        {session?.reachable && !ready && !image ? (
          <p className="mt-3 text-sm text-[#5c5348]">Le QR s&apos;affiche dans le terminal où OpenWA tourne.</p>
        ) : null}
      </section>

      <section>
        <h2 className="font-serif text-2xl">Dernières lectures</h2>
        <div className="mt-3 flex flex-col gap-3">
          {reports.length === 0 ? <p className="text-sm text-[#5c5348]">Aucune lecture pour l&apos;instant.</p> : null}
          {reports.map((report) => (
            <article key={report.id} className="rounded-2xl border border-line bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#5c5348]">
                {headline(report.verdict)} · {report.source === "whatsapp" ? "WhatsApp" : report.source === "web" ? "Site" : "Exemple"}
                {report.numero ? ` · ${report.numero}` : ""}
              </p>
              <p className="mt-1 text-sm">{report.messageSimple}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
