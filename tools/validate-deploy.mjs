import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "render.yaml",
  "backend/package.json",
  "backend/package-lock.json",
  "backend/config.js",
  "backend/sds-parser.js",
  "backend/server.js",
  "chemicalsearch-site/index.html",
  "chemicalsearch-site/app-base.css",
  "chemicalsearch-site/styles.css",
  "chemicalsearch-site/sojo-theme.css",
  "chemicalsearch-site/runtime-config.js",
  "chemicalsearch-site/app.js",
  "chemicalsearch-site/autofill-client.js",
  "chemicalsearch-site/layout-fixes.js",
  "chemicalsearch-site/sojologo.webp",
  "chemicalsearch-site/sds-approved.js"
];

for (let index = 1; index <= 6; index += 1) {
  requiredFiles.push(`chemicalsearch-site/sds-data-${index}.js`);
}

const missing = requiredFiles.filter((file) => !existsSync(path.join(root, file)));

if (missing.length) {
  console.error(`Missing deploy files:\n${missing.map((file) => `- ${file}`).join("\n")}`);
  process.exit(1);
}

const indexHtml = readFileSync(path.join(root, "chemicalsearch-site/index.html"), "utf8");
const assetRefs = [...indexHtml.matchAll(/(?:href|src)="([^"]+)"/g)]
  .map((match) => match[1].replace(/\?.*$/, ""))
  .filter((ref) => !/^https?:\/\//i.test(ref));
const missingRefs = assetRefs.filter((ref) => !existsSync(path.join(root, "chemicalsearch-site", ref)));

if (missingRefs.length) {
  console.error(`index.html references missing files:\n${missingRefs.map((file) => `- ${file}`).join("\n")}`);
  process.exit(1);
}

for (const file of ["backend/server.js", "backend/sds-parser.js", "backend/config.js"]) {
  const result = spawnSync(process.execPath, ["--check", file], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log("Deploy validation passed.");
