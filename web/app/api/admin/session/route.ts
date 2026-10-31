import { getOpenWaSession } from "@/lib/openwa";
import { connection } from "next/server";

export async function GET() {
  await connection();
  return Response.json(await getOpenWaSession());
}
