import { seedDemo } from "@/lib/demo";
import { connection } from "next/server";

export async function POST() {
  await connection();
  await seedDemo();
  return Response.json({ ok: true });
}
