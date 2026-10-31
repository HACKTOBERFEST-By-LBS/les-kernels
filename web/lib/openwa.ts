const DEFAULT_KEY = "hackathon-dev-key";

export function openwaConfig() {
  return {
    baseUrl: (process.env.OPENWA_API_URL || "http://127.0.0.1:8080").replace(/\/$/, ""),
    apiKey: process.env.WA_API_KEY || DEFAULT_KEY,
  };
}

export async function sendWhatsAppText(to: string, content: string) {
  const { baseUrl, apiKey } = openwaConfig();
  const response = await fetch(`${baseUrl}/api/messages/sendText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ to, content, options: {} }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

const MEDIA_ROUTES = ["/api/media/decrypt", "/api/decryptMedia"];

function findBase64(value: unknown): string | null {
  if (typeof value === "string") return value.length > 100 ? value : null;
  if (value && typeof value === "object") {
    for (const key of ["response", "result", "data", "media", "base64"]) {
      const found = findBase64((value as Record<string, unknown>)[key]);
      if (found) return found;
    }
  }
  return null;
}

export async function downloadWhatsAppMedia(
  message: Record<string, unknown>,
): Promise<{ mimeType: string; data: string } | null> {
  const { baseUrl, apiKey } = openwaConfig();
  for (const route of MEDIA_ROUTES) {
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) continue;
      const raw = response.headers.get("content-type")?.includes("json")
        ? findBase64(await response.json())
        : findBase64(await response.text());
      if (!raw) continue;
      const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(raw);
      const fallbackMime = typeof message.mimetype === "string" ? message.mimetype : "image/jpeg";
      return match ? { mimeType: match[1], data: match[2] } : { mimeType: fallbackMime, data: raw };
    } catch (error) {
      console.error(`Téléchargement du média impossible via ${route}`, error);
    }
  }
  return null;
}

type HealthBody = {
  status?: string;
  connected?: boolean;
  qr?: string;
  qrCode?: string;
  session?: { ready?: boolean; qr?: string };
};

export async function getOpenWaSession() {
  const { baseUrl, apiKey } = openwaConfig();
  try {
    const signal = AbortSignal.timeout(2000);
    let response = await fetch(`${baseUrl}/health`, { cache: "no-store", signal });
    if (response.status === 401) {
      response = await fetch(`${baseUrl}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
        headers: { "X-API-Key": apiKey },
      });
    }
    if (!response.ok) {
      return { reachable: false as const, detail: `HTTP ${response.status}` };
    }
    const body = (await response.json()) as HealthBody;
    const qr = [body.qr, body.qrCode, body.session?.qr].find(
      (value): value is string => typeof value === "string" && value.length > 20,
    );
    return {
      reachable: true as const,
      ok: body.status === "ok",
      connected: Boolean(body.connected),
      ready: Boolean(body.session?.ready),
      qr: qr ?? null,
    };
  } catch {
    return { reachable: false as const, detail: "OpenWA ne répond pas." };
  }
}
