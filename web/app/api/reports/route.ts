import { readStore } from "@/lib/store";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const reports = [...readStore().reports]
    .reverse()
    .slice(0, 12)
    .map((report) => ({
      id: report.id,
      createdAt: report.createdAt,
      source: report.source,
      verdict: report.verdict,
      typeArnaque: report.typeArnaque,
      numero: report.numero,
      messageSimple: report.messageSimple,
    }));
  return Response.json({ reports });
}
