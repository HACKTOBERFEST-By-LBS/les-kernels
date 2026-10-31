const webhookSecret = process.env.OPEN_WA_WEBHOOK_SECRET?.trim() || "hackathon-local-secret";
const webhookUrl =
  process.env.OPENWA_WEBHOOK_URL?.trim() || "http://127.0.0.1:3000/api/webhooks/openwa";

export default {
  sessionId: "alerte",
  host: "127.0.0.1",
  port: 8080,
  apiKey: process.env.WA_API_KEY?.trim() || "hackathon-dev-key",
  plugins: ["@open-wa/integration-webhook"],
  pluginConfig: {
    webhook: {
      url: webhookUrl,
      events: ["message.received", "session.state.changed"],
      headers: { "X-Webhook-Secret": webhookSecret },
      retries: 2,
      retryDelay: 1000,
      timeout: 30000,
    },
  },
};
