import { handleMessage } from "@/lib/handle-message";
import { getChat } from "@/lib/store";
import { connection } from "next/server";

const MAX_TEXT = 4000;
const MAX_IMAGE_BASE64 = 6_000_000;
const ALLOWED_MIME = /^(image\/(png|jpe?g|webp|heic|heif|gif)|application\/pdf)$/;

function webChatId(raw: unknown) {
  const value = typeof raw === "string" ? raw.trim() : "";
  return /^[A-Za-z0-9-]{8,64}$/.test(value) ? `web:${value}` : "web:anonyme";
}

function refuse(reply: string, status: number) {
  return Response.json({ reply, mode: "scanner", report: null, failed: true }, { status });
}

export async function GET(request: Request) {
  await connection();
  const chatId = webChatId(new URL(request.url).searchParams.get("chatId"));
  return Response.json({ mode: getChat(chatId).mode });
}

export async function POST(request: Request) {
  await connection();
  let body: { chatId?: unknown; text?: unknown; imageBase64?: unknown; mimeType?: unknown; sender?: unknown };
  try {
    body = await request.json();
  } catch {
    return refuse("Requête illisible.", 400);
  }

  const text = typeof body.text === "string" ? body.text : "";
  if (text.length > MAX_TEXT) return refuse("Message trop long. Colle seulement le SMS.", 413);

  let image: { mimeType: string; data: string } | undefined;
  if (typeof body.imageBase64 === "string" && body.imageBase64) {
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    if (!ALLOWED_MIME.test(mimeType)) return refuse("Envoie une image (photo ou capture) ou un PDF.", 415);
    if (body.imageBase64.length > MAX_IMAGE_BASE64) {
      return refuse("Fichier trop lourd. Choisis une capture plus légère.", 413);
    }
    image = { mimeType, data: body.imageBase64 };
  }

  const result = await handleMessage({
    chatId: webChatId(body.chatId),
    text,
    image,
    sender: typeof body.sender === "string" ? body.sender.trim().slice(0, 40) : "",
    source: "web",
  });

  return Response.json(result);
}
