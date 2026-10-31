import { handleMessage } from "@/lib/handle-message";
import { sendWhatsAppText } from "@/lib/openwa";
import { hasSeen, markSeen } from "@/lib/store";
import { connection } from "next/server";

const DEFAULT_SECRET = "hackathon-local-secret";
const secret = process.env.OPEN_WA_WEBHOOK_SECRET?.trim() || DEFAULT_SECRET;
const PRIVATE_CHAT = /^\d{6,20}@(c\.us|lid)$/;

if (secret === DEFAULT_SECRET) {
  console.warn(
    "OPEN_WA_WEBHOOK_SECRET a sa valeur par défaut : n'importe qui sur le réseau peut faire écrire le bot. Change-la dans le .env.",
  );
}

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
  if (body.event !== "message.received" || !message?.from || message.fromMe || message.isGroupMsg || !PRIVATE_CHAT.test(message.from)) {
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
