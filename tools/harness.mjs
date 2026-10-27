// Shared test harness: serves a folder over HTTP, opens it in Chromium and takes
// screenshots. The page is sealed off from the internet so every run looks the same:
//  - Lucide (the icon library) is served from node_modules instead of unpkg
//  - the Open-Meteo weather API answers with a fixed forecast (see fakeWeather)
//  - the clock is frozen at FIXED_TIME
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// require() also finds a globally installed Playwright (NODE_PATH), import does not.
const { chromium } = createRequire(import.meta.url)("playwright");

const here = dirname(fileURLToPath(import.meta.url));
const LUCIDE = join(here, "node_modules/lucide/dist/umd/lucide.min.js");
export const FIXED_TIME = "2026-10-24T14:18:00";
export const VIEWPORT = { width: 1440, height: 900 };

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" };

export function serve(root) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    try {
      const body = await readFile(join(root, path === "/" ? "index.html" : path));
      res.writeHead(200, { "content-type": TYPES[extname(path)] || "text/html" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

// A believable forecast: 48 hourly values starting at midnight of FIXED_TIME's day.
export function fakeWeather() {
  const day = FIXED_TIME.slice(0, 10);
  const next = new Date(day + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + 1);
  const days = [day, next.toISOString().slice(0, 10)];
  const time = [], temperature_2m = [], weather_code = [], is_day = [];
  for (let h = 0; h < 48; h++) {
    const hh = String(h % 24).padStart(2, "0");
    time.push(`${days[Math.floor(h / 24)]}T${hh}:00`);
    const t = 21.4 + 6.8 * Math.sin(((h % 24) - 9) / 24 * Math.PI * 2);
    temperature_2m.push(Math.round(t * 10) / 10);
    weather_code.push([1, 2, 0, 0, 2, 3][h % 6]);
    is_day.push(h % 24 >= 6 && h % 24 < 18 ? 1 : 0);
  }
  return {
    current: { time: FIXED_TIME.slice(0, 16), temperature_2m: 27.6, weather_code: 3, is_day: 1 },
    hourly: { time, temperature_2m, weather_code, is_day },
    daily: { time: days, temperature_2m_max: [28.2, 27.1], temperature_2m_min: [18.6, 17.9] },
  };
}

export async function launch() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  return { browser, context };
}

export async function openPage(context, url, { errors } = {}) {
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  // Same Wi-Fi speed and battery on every run
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", { value: Object.assign(new EventTarget(), { downlink: 1.8 }) });
    const battery = Object.assign(new EventTarget(), { level: 0.88, charging: false });
    navigator.getBattery = () => Promise.resolve(battery);
  });
  await page.route(/unpkg\.com\/lucide@/, async (route) =>
    route.fulfill({ contentType: "text/javascript", body: await readFile(LUCIDE) }));
  await page.route(/api\.open-meteo\.com/, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(fakeWeather()),
      headers: { "access-control-allow-origin": "*" } }));
  if (errors) {
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  }
  await page.goto(url, { waitUntil: "load" });
  return page;
}

// Tiny action language used by the steps file, one action per line:
//   wait 800 | click .selector | hover .selector | move 700 880 | rightclick 600 400
//   key Meta+k | type hello | eval js-expression
export async function act(page, line) {
  const [cmd, ...rest] = line.trim().split(" ");
  const arg = rest.join(" ");
  if (cmd === "wait") return page.waitForTimeout(Number(arg));
  if (cmd === "click") return page.click(arg);
  if (cmd === "hover") return page.hover(arg);
  if (cmd === "move") return page.mouse.move(Number(rest[0]), Number(rest[1]), { steps: 8 });
  if (cmd === "rightclick") return page.mouse.click(Number(rest[0]), Number(rest[1]), { button: "right" });
  if (cmd === "key") return page.keyboard.press(arg);
  if (cmd === "type") return page.keyboard.type(arg, { delay: 30 });
  if (cmd === "drag") {
    const [x1, y1, x2, y2] = rest.map(Number);
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    await page.mouse.move(x2, y2, { steps: 12 });
    return page.mouse.up();
  }
  if (cmd === "eval") return page.evaluate(arg);
  throw new Error("Unknown action: " + line);
}
