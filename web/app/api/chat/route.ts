import { handleMessage } from "@/lib/handle-message";
import { connection } from "next/server";

export async function POST(request: Request) {
  await connection();
  const body = (await request.json()) as {
    chatId?: string;
    text?: string;
    imageBase64?: string;
    mimeType?: string;
  };

  const image =
    body.imageBase64 && body.mimeType
      ? { mimeType: body.mimeType, data: body.imageBase64 }
      : undefined;

  if (image && image.data.length > 6_000_000) {
    return Response.json(
      { reply: "Image trop lourde. Choisis une capture plus légère.", mode: "scanner", report: null },
      { status: 413 },
    );
  }

  const result = await handleMessage({
    chatId: body.chatId?.trim() || "web",
    text: body.text ?? "",
    image,
    source: "web",
  });

  return Response.json(result);
}
