import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootEnv = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const webhookSecret = process.env.OPEN_WA_WEBHOOK_SECRET?.trim() || "hackathon-local-secret";
const webhookUrl =
  process.env.OPENWA_WEBHOOK_URL?.trim() || "http://127.0.0.1:3000/api/webhooks/openwa";
const inDocker = process.env.WA_IN_DOCKER === "true";

export default {
  sessionId: "alerte",
  host: process.env.WA_HOST?.trim() || "127.0.0.1",
  port: 8080,
  apiKey: process.env.WA_API_KEY?.trim() || "hackathon-dev-key",
  headless: inDocker || process.env.WA_HEADLESS === "true",
  qrTimeout: 0,
  authTimeout: 0,
  ezqr: true,
  ...(process.env.WA_USER_DATA_DIR?.trim()
    ? { userDataDir: process.env.WA_USER_DATA_DIR.trim() }
    : {}),
  ...(process.env.WA_EXECUTABLE_PATH?.trim()
    ? { executablePath: process.env.WA_EXECUTABLE_PATH.trim() }
    : {}),
  ...(inDocker
    ? { chromiumArgs: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] }
    : {}),
  plugins: ["@open-wa/integration-webhook"],
  pluginConfig: {
    webhook: {
      url: webhookUrl,
      events: ["message.received", "session.state.changed"],
      headers: { "X-Webhook-Secret": webhookSecret },
      retries: 2,
      retryDelay: 1000,
      timeout: 60000,
    },
  },
};
