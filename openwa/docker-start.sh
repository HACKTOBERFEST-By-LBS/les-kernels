#!/bin/bash
set -eu
cd /usr/src/app
if [ -f /tmp/.X99-lock ]; then rm -f /tmp/.X99-lock; fi

node <<'EOF'
const fs = require("node:fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.overrides = {
  effect: "4.0.0-beta.100",
  "@effect/platform-node-shared": "4.0.0-beta.100",
};
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
EOF

unset WA_POPUP

PUPPETEER_SKIP_DOWNLOAD=true npm install \
  @open-wa/wa-automate@5.1.0 \
  @open-wa/integration-webhook@5.1.0 \
  --ignore-scripts

exec node ./node_modules/@open-wa/wa-automate/dist/cli.cjs \
  --use-chrome \
  --headless \
  --qr-timeout 0 \
  --session-id alerte \
  --host 0.0.0.0 \
  --port 8080 \
  --config /openwa/wa.config.mjs
