import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootEnv = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const base = (process.env.OPENWA_API_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const webhook = process.env.OPENWA_WEBHOOK_URL || "http://127.0.0.1:3000/api/webhooks/openwa";
const headers = { "X-API-Key": process.env.WA_API_KEY ?? "" };
const PRIVATE = /^\d{6,20}@(c\.us|lid)$/;
const READABLE = new Set(["chat", "image", "document"]);
const seen = new Set();
const startedAt = Date.now() / 1000 - 20 * 60;

async function api(path) {
  const response = await fetch(`${base}${path}`, { headers });
  if (!response.ok) throw new Error(`${path} → HTTP ${response.status}`);
  const body = await response.json();
  return body.data ?? body;
}

async function tick() {
  const chats = await api("/api/chats/getAll");
  if (!Array.isArray(chats)) return;

  for (const chat of chats) {
    const chatId = String(chat.id?._serialized ?? chat.id ?? "");
    if (!PRIVATE.test(chatId) || !chat.unreadCount) continue;

    const messages = await api(`/api/messages/getAll?chatId=${encodeURIComponent(chatId)}`);
    if (!Array.isArray(messages)) continue;

    for (const message of messages) {
      const id = String(message.id?._serialized ?? message.id ?? "");
      if (!id || seen.has(id) || message.fromMe || !READABLE.has(message.type)) continue;
      if (Number(message.t) < startedAt) continue;
      seen.add(id);

      const response = await fetch(webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": process.env.OPEN_WA_WEBHOOK_SECRET ?? "",
        },
        body: JSON.stringify({
          event: "message.received",
          payload: {
            message: {
              ...message,
              id,
              from: message.from,
              body: message.body ?? "",
              caption: message.caption ?? "",
              type: message.type,
              mimetype: message.mimetype,
              isMedia: Boolean(message.isMedia),
              fromMe: false,
              isGroupMsg: false,
            },
          },
        }),
      });
      console.log(`transmis « ${String(message.body ?? "").slice(0, 24)} » → ${response.status}`);
    }
  }
}

console.log("Relais démarré : les messages WhatsApp sont lus toutes les 3 s.");
setInterval(() => {
  tick().catch((error) => console.error("relais", error.message));
}, 3000);
tick().catch((error) => console.error("relais", error.message));
