import { handleMessage } from "@/lib/handle-message";
import { downloadWhatsAppMedia, sendWhatsAppText } from "@/lib/openwa";
import { hasSeen, markSeen } from "@/lib/store";
import { connection } from "next/server";

const DEFAULT_SECRET = "hackathon-local-secret";
const secret = process.env.OPEN_WA_WEBHOOK_SECRET?.trim() || DEFAULT_SECRET;
const PRIVATE_CHAT = /^\d{6,20}@(c\.us|lid)$/;
const READABLE_MEDIA = /^(image\/|application\/pdf)/;

if (secret === DEFAULT_SECRET) {
  console.warn(
    "OPEN_WA_WEBHOOK_SECRET a sa valeur par défaut : n'importe qui sur le réseau peut faire écrire le bot. Change-la dans le .env.",
  );
}

type WaMessage = {
  id?: string;
  from?: string;
  body?: string;
  caption?: string;
  filename?: string;
  type?: string;
  mimetype?: string;
  isMedia?: boolean;
  fromMe?: boolean;
  isGroupMsg?: boolean;
};

type Envelope = {
  event?: string;
  payload?: { message?: WaMessage & Record<string, unknown> };
};

async function send(to: string, content: string) {
  try {
    await sendWhatsAppText(to, content);
  } catch (error) {
    console.error("Envoi WhatsApp impossible", error);
  }
}

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
  if (
    body.event !== "message.received" ||
    !message?.from ||
    message.fromMe ||
    message.isGroupMsg ||
    !PRIVATE_CHAT.test(message.from)
  ) {
    return new Response(null, { status: 204 });
  }

  if (message.id && hasSeen(message.id)) return new Response(null, { status: 204 });
  if (message.id) await markSeen(message.id);

  const isMedia = Boolean(message.isMedia) || ["image", "document"].includes(message.type ?? "");
  let image: { mimeType: string; data: string } | undefined;
  if (isMedia) {
    if (message.mimetype && !READABLE_MEDIA.test(message.mimetype)) {
      await send(message.from, "Je lis les captures d'écran, les photos et les PDF. Envoie le SMS en texte ou en capture.");
      return new Response(null, { status: 204 });
    }
    image = (await downloadWhatsAppMedia(message)) ?? undefined;
    if (!image) {
      await send(message.from, "Je n'ai pas pu ouvrir la capture. Copie le texte du SMS et envoie-le ici.");
      return new Response(null, { status: 204 });
    }
  }

  const caption = message.caption && message.caption !== message.filename ? message.caption : "";
  const result = await handleMessage({
    chatId: message.from,
    text: isMedia ? caption : message.body || "",
    image,
    source: "whatsapp",
  });

  await send(message.from, result.reply);
  return new Response(null, { status: 204 });
}
