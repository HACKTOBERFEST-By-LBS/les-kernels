import { readStore } from "@/lib/store";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const reports = [...readStore().reports].reverse().slice(0, 12);
  return Response.json({ reports });
}
