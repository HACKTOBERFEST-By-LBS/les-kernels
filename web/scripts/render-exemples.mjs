import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(path.resolve("../openwa/package.json"));
const puppeteer = require("puppeteer");

const root = path.resolve("scripts");
const outDir = path.resolve("public/exemples-fraudes");
const ids = [
  "depot-par-erreur",
  "faux-gain",
  "faux-agent",
  "banque-bloquee",
  "faux-colis",
  "faux-emploi",
  "faux-pret",
  "urgence-proche",
  "code-ussd",
  "lien-confirmation",
];

const browser = await puppeteer.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 900, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(path.join(root, "exemples-fraudes.html")).href, { waitUntil: "load" });
  await mkdir(outDir, { recursive: true });
  for (const [index, id] of ids.entries()) {
    const handle = await page.$(`#${id}`);
    const file = path.join(outDir, `${String(index + 1).padStart(2, "0")}-${id}.png`);
    await handle.screenshot({ path: file });
    console.log(file);
  }
} finally {
  await browser.close();
}
