// Screenshot a folder for a quick look while developing.
// Usage: node shoot.mjs <folder> <out.png> ["action" ...]
// Actions use the same language as the steps file (see harness.mjs).
import { resolve } from "node:path";
import { serve, launch, openPage, act } from "./harness.mjs";

const [dir, out, ...actions] = process.argv.slice(2);
const server = await serve(resolve(dir));
const { browser, context } = await launch();
const errors = [];
const page = await openPage(context, `http://127.0.0.1:${server.address().port}/`, { errors });
await page.waitForTimeout(1200);
for (const a of actions) await act(page, a);
await page.screenshot({ path: out });
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
await browser.close();
server.close();
