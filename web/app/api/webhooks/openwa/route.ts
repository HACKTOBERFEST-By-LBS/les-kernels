import { handleMessage } from "@/lib/handle-message";
import { sendWhatsAppText } from "@/lib/openwa";
import { hasSeen, markSeen } from "@/lib/store";
import { connection } from "next/server";

const secret = process.env.OPEN_WA_WEBHOOK_SECRET || "hackathon-local-secret";

type Envelope = {
  event?: string;
  payload?: {
    message?: {
      id?: string;
      from?: string;
      body?: string;
      caption?: string;
      fromMe?: boolean;
      isGroupMsg?: boolean;
    };
  };
};

export async function POST(request: Request) {
  await connection();
  if (request.headers.get("x-webhook-secret") !== secret) {
    return new Response(null, { status: 401 });
  }

  let body: Envelope;
  try {
    body = (await request.json()) as Envelope;
  } catch {
    return new Response(null, { status: 400 });
  }

  const message = body.payload?.message;
  if (body.event !== "message.received" || !message?.from || message.fromMe || message.isGroupMsg || message.from.endsWith("@g.us")) {
    return new Response(null, { status: 204 });
  }

  if (message.id && hasSeen(message.id)) return new Response(null, { status: 204 });
  if (message.id) await markSeen(message.id);

  const result = await handleMessage({
    chatId: message.from,
    text: message.body || message.caption || "",
    source: "whatsapp",
  });

  try {
    await sendWhatsAppText(message.from, result.reply);
  } catch (error) {
    console.error("Envoi WhatsApp impossible", error);
  }

  return new Response(null, { status: 204 });
}
