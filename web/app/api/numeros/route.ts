import { gangs, numberCards } from "@/lib/reputation";
import { readStore } from "@/lib/store";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const { reports } = readStore();
  return Response.json({
    numbers: numberCards(reports),
    gangs: gangs(reports),
  });
}
