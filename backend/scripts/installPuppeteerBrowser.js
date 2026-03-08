import { execSync } from "node:child_process";
import path from "node:path";

const defaultCacheDir = path.resolve(process.cwd(), ".cache", "puppeteer");
const configuredCacheDir = String(process.env.PUPPETEER_CACHE_DIR || "").trim();
const cacheDir =
  configuredCacheDir && !configuredCacheDir.startsWith("/tmp")
    ? configuredCacheDir
    : defaultCacheDir;

process.env.PUPPETEER_CACHE_DIR = cacheDir;

console.log(`[puppeteer] Ensuring Chrome browser install (cache: ${cacheDir})`);
execSync("npx puppeteer browsers install chrome", {
  stdio: "inherit",
  env: {
    ...process.env,
    PUPPETEER_CACHE_DIR: cacheDir,
  },
});
console.log("[puppeteer] Chrome installation complete");
