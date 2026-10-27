// Builds the recording script (../recording-script/index.html) from plan.mjs.
//
//   node build.mjs            check every step, take screenshots, write the page
//   node build.mjs --quick    check every step and write the page, no screenshots
//
// "Check" means: start from four empty files, apply the steps one by one
// (every anchor line must exist exactly once), load the page in Chromium after
// every run step and fail on any JavaScript error, and at the end compare the
// files with ../desktop byte for byte.

import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHAPTERS, FILES, FINAL_SHOTS, VIDEO } from "./plan.mjs";
import { VIEWPORT, act, launch, openPage, serve } from "./harness.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DESKTOP = join(here, "..", "desktop");
const OUT = join(here, "..", "recording-script");
const quick = process.argv.includes("--quick");

const work = mkdtempSync(join(tmpdir(), "macos-steps-"));
cpSync(join(DESKTOP, "icons"), join(work, "icons"), { recursive: true });
const files = Object.fromEntries(FILES.map((name) => [name, []]));

function fail(message) {
  console.error("FAILED: " + message);
  process.exit(1);
}

function apply(step) {
  const lines = files[step.file];
  if (!lines) fail(`step ${step.n}: unknown file ${step.file}`);
  if (step.op === "create") {
    if (lines.length) fail(`step ${step.n}: ${step.file} is not empty`);
    lines.push(...step.code);
    return;
  }
  if (step.op === "append") {
    if (!lines.length) fail(`step ${step.n}: ${step.file} is still empty`);
    lines.push(...step.code);
    return;
  }
  const hits = lines.flatMap((line, i) => (line === step.anchor ? [i] : []));
  if (hits.length !== 1) fail(`step ${step.n}: anchor found ${hits.length} times in ${step.file}: ${step.anchor}`);
  const i = hits[0];
  if (step.op === "insert_after_line") lines.splice(i + 1, 0, ...step.code);
  else if (step.op === "insert_before_line") lines.splice(i, 0, ...step.code);
  else if (step.op === "replace_line") lines.splice(i, 1, ...step.code);
  else fail(`step ${step.n}: unknown op ${step.op}`);
}

function writeWork() {
  for (const [name, lines] of Object.entries(files)) {
    writeFileSync(join(work, name), lines.length ? lines.join("\n") + "\n" : "");
  }
}

// ---- Replay the steps ----

const steps = [];
const chapters = CHAPTERS.map((chapter, chapterIndex) => {
  const numbers = [];
  for (const plan of chapter.steps) {
    const step = { ...plan, n: steps.length + 1, chapter: chapter.name, chapterIndex };
    numbers.push(step.n);
    steps.push(step);
  }
  return { name: chapter.name, steps: numbers };
});

let browser, context, server;
if (!quick) {
  ({ browser, context } = await launch());
  server = await serve(work);
  mkdirSync(join(OUT, "shots"), { recursive: true });
}

for (const step of steps) {
  apply(step);
  step.shot = null;
  if (!step.run || quick) continue;
  writeWork();
  const errors = [];
  const page = await openPage(context, `http://127.0.0.1:${server.address().port}/`, { errors });
  for (const action of step.actions || []) await act(page, action);
  const shot = `shots/step${String(step.n).padStart(2, "0")}.jpg`;
  await page.screenshot({ path: join(OUT, shot), type: "jpeg", quality: 80 });
  await page.close();
  if (errors.length) fail(`step ${step.n} (${step.title}) has errors:\n  ` + errors.join("\n  "));
  step.shot = shot;
  console.log(`step ${step.n} ran clean: ${step.title}`);
}

// ---- The steps must rebuild the finished project exactly ----

const totals = {};
for (const name of FILES) {
  const built = files[name].join("\n") + "\n";
  const real = readFileSync(join(DESKTOP, name), "utf8");
  if (built !== real) {
    const a = built.split("\n"), b = real.split("\n");
    const i = a.findIndex((line, j) => line !== b[j]);
    fail(`${name} differs from desktop/${name} at line ${i + 1}:\n  steps: ${a[i]}\n  real:  ${b[i]}`);
  }
  totals[name] = { lines: files[name].length, typed: files[name].filter((l) => l.trim()).length };
}
console.log("The steps rebuild every file exactly:", totals);

// ---- Screenshots of the finished desktop ----

const finalShots = [];
if (!quick) {
  server.close();
  server = await serve(DESKTOP);
  for (const [i, final] of FINAL_SHOTS.entries()) {
    const errors = [];
    const page = await openPage(context, `http://127.0.0.1:${server.address().port}/`, { errors });
    for (const action of final.actions) await act(page, action);
    const src = `shots/final${i + 1}.jpg`;
    await page.screenshot({ path: join(OUT, src), type: "jpeg", quality: 80 });
    await page.close();
    if (errors.length) fail(`final shot ${i + 1} has errors:\n  ` + errors.join("\n  "));
    finalShots.push({ src, caption: final.caption });
  }
  await browser.close();
  server.close();
} else {
  // Keep the screenshots from the last full build
  FINAL_SHOTS.forEach((final, i) => finalShots.push({ src: `shots/final${i + 1}.jpg`, caption: final.caption }));
  for (const step of steps) if (step.run) step.shot = `shots/step${String(step.n).padStart(2, "0")}.jpg`;
}
rmSync(work, { recursive: true, force: true });

// ---- Write the page ----

const data = {
  ...VIDEO,
  chapters,
  steps: steps.map((s) => ({
    n: s.n, chapter: s.chapter, chapterIndex: s.chapterIndex, title: s.title, file: s.file,
    op: s.op, anchor: s.anchor ?? null, where: s.where, code: s.code.join("\n"), preview: s.preview,
    run: Boolean(s.run), lines: s.code.length, typed: s.code.filter((l) => l.trim()).length, shot: s.shot,
  })),
  totals,
  finalShots,
  shotSize: [VIEWPORT.width, VIEWPORT.height],
};

const template = readFileSync(join(here, "script-template.html"), "utf8");
const json = JSON.stringify(data).replace(/</g, "\\u003c");
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "index.html"), template.replace("/*STEPS_DATA*/", () => json));
console.log(`Wrote recording-script/index.html: ${steps.length} steps in ${chapters.length} chapters.`);
