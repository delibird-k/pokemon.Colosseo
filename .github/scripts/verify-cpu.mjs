import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => typeof runVersus === "function" && typeof bpSuperFor === "function", null, { timeout: 30000 });

// Exercise the real title-screen flow before running battles.
await page.evaluate(() => document.getElementById("bc").click());
const countButtons = await page.locator("#cpuCounts button").count();
if (countButtons !== 8) throw new Error("Expected 8 player-count buttons, got " + countButtons);
await page.locator("#cpuCounts button").first().click();
const selectorText = await page.locator("#cpuStrengthHud").innerText();
if (!selectorText.includes("学習前のCPU") || !selectorText.includes("学習後の最強CPU")) {
  throw new Error("Strength selector is missing an option: " + selectorText);
}
await page.locator("#cpuStrengthCancel").click();
const selectorClosed = await page.locator("#cpuStrengthHud").evaluate(el => el.hidden);
if (!selectorClosed) throw new Error("Strength selector did not close correctly.");

const cases = [
  { players: 2, games: 5000, superMode: false }, // learned profile baseline
  { players: 2, games: 5000, superMode: true },
  { players: 3, games: 1000, superMode: true },
  { players: 5, games: 1000, superMode: true },
  { players: 9, games: 1000, superMode: true },
];
const results = [];
for (const test of cases) {
  const result = await page.evaluate(async ({ players, games, superMode }) => {
    await runVersus(games, players, superMode);
    const text = document.getElementById("trainResults")?.textContent || "";
    const m = text.match(/★の勝利：\s*(\d+)\s*\/\s*(\d+)試合（勝率\s*([\d.]+)%/);
    const draws = Number((text.match(/勝者なし：\s*(\d+)/) || [])[1] || 0);
    return { text, wins: m ? Number(m[1]) : null, games: m ? Number(m[2]) : null, winRatePct: m ? Number(m[3]) : null, draws };
  }, test);
  results.push({ ...test, ...result });
  console.log(JSON.stringify(results.at(-1)));
  if (result.wins === null || result.games !== test.games) throw new Error("Could not parse completed battle results: " + result.text);
  if (errors.length) throw new Error("Browser runtime error: " + errors.join("\n"));
}
fs.writeFileSync("cpu-verification-results.json", JSON.stringify({ commit: process.env.GITHUB_SHA || "local", results, pageErrors: errors }, null, 2));
await browser.close();
