// The recording plan: every step the video types, in order.
//
// Code is cut straight out of the finished files in ../desktop, between two
// marker lines, so the plan can never drift from the real project. build.mjs
// replays the steps on empty files and checks the result is byte-for-byte the
// finished project, then takes a screenshot after every "run" step.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DESKTOP = join(dirname(fileURLToPath(import.meta.url)), "..", "desktop");

class Source {
  constructor(name) {
    this.name = name;
    this.lines = readFileSync(join(DESKTOP, name), "utf8").replace(/\n$/, "").split("\n");
  }

  // The line number of a marker. Markers must appear exactly once.
  at(marker) {
    const hits = this.lines.flatMap((line, i) => (line === marker ? [i] : []));
    if (hits.length !== 1) throw new Error(`${this.name}: marker found ${hits.length} times: ${marker}`);
    return hits[0];
  }

  // Lines from `start` up to (not including) `end`, without trailing blank lines.
  // With no `end`, up to the end of the file.
  slice(start, end) {
    const lines = this.lines.slice(this.at(start), end ? this.at(end) : undefined);
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    return lines;
  }
}

export const html = new Source("index.html");
export const css = new Source("style.css");
export const gl = new Source("wallpaper.js");
export const js = new Source("script.js");

export const FILES = ["index.html", "style.css", "wallpaper.js", "script.js"];
export const LUCIDE = '  <script src="https://unpkg.com/lucide@1.48.0/dist/umd/lucide.min.js"></script>';

// Swap one line of a code block, for the planned bugs
function swap(lines, from, to) {
  const i = lines.indexOf(from);
  if (i < 0) throw new Error("swap: line not found: " + from);
  return [...lines.slice(0, i), ...[].concat(to), ...lines.slice(i + 1)];
}

// Helpers that build one step
const createFile = (src, start, end) => ({ file: src.name, op: "create", code: src.slice(start, end) });
const appendTo = (src, start, end) => ({ file: src.name, op: "append", code: ["", ...src.slice(start, end)] });
const htmlBlock = (start, end) => ({
  file: "index.html", op: "insert_before_line", anchor: LUCIDE, code: [...html.slice(start, end), ""],
});

const WHERE_HTML = "In index.html, right above the first <script> line. End with an empty line.";
const atEnd = (name) => `At the end of ${name}. Start with an empty line.`;
const RELOAD_WAIT = "wait 1200";

const BUGGY_PAINT = [
  "",
  "function paint(ms) {",
  "  gl.uniform2f(sizeSlot, canvas.width, canvas.height);",
  "  gl.uniform1f(timeSlot, ms / 1000);",
  "  gl.drawArrays(gl.TRIANGLES, 0, 3);",
  "  requestAnimationFrame(paint);",
  "}",
  "",
  "requestAnimationFrame(paint);",
];

const OPEN_CHECK = [
  "  const open = document.querySelector(`.window[data-app=\"${id}\"]`);",
  "  if (open) return focusWindow(open);",
];

export const VIDEO = {
  series: "macOS Desktop · Video 3",
  videoTitle: "ASMR Programming - macOS Desktop in the Browser with a Live Shader Wallpaper - HTML, CSS & JavaScript - No Talking",
  run: "Save with ⌘S, switch to Chrome with ⌘Tab and reload with ⌘R.",
};

export const CHAPTERS = [
  {
    name: "The page",
    steps: [
      {
        title: "The page skeleton",
        ...createFile(html, "<!DOCTYPE html>", "  <!-- Menu bar -->"),
        code: [...html.slice("<!DOCTYPE html>", "  <!-- Menu bar -->"), "", ...html.slice(LUCIDE)],
        where: "Empty file. The three <script> tags at the bottom load the icon library, the wallpaper and the desktop, in that order.",
        preview: "Nothing to run yet.",
      },
      {
        title: "Base styles and the wallpaper canvas",
        ...createFile(css, "/* ---- Base ---- */", "/* ---- Menu bar ---- */"),
        where: "Empty file. --hue is the wallpaper colour; System Settings changes it later.",
        preview: "Nothing to run yet. The page is still black.",
      },
    ],
  },
  {
    name: "Live wallpaper",
    steps: [
      {
        title: "The shader: colours of the ribbons",
        ...createFile(gl, gl.lines[0], "void main() {"),
        where: "Empty file. The shader is a program for the graphics card, written in GLSL and kept in a JavaScript string. The backtick on the SHADER line opens that string.",
        preview: "Nothing to run yet.",
      },
      {
        title: "The shader: six ribbons of light",
        ...appendTo(gl, "void main() {", "const canvas = document.getElementById(\"wallpaper\");"),
        where: atEnd("wallpaper.js") + " It runs once for every pixel. The last line closes the string with a backtick.",
        preview: "Nothing to run yet.",
      },
      {
        title: "Hand the shader to WebGL",
        ...appendTo(gl, "const canvas = document.getElementById(\"wallpaper\");", "function paint(ms) {"),
        where: atEnd("wallpaper.js"),
        preview: "Nothing to run yet. One more step.",
      },
      {
        title: "Paint every frame, then the first run",
        file: "wallpaper.js", op: "append", code: BUGGY_PAINT,
        where: atEnd("wallpaper.js") + " Type it exactly like this. It hides bug 1, which you fix in the next step.",
        preview: "Deep blue ribbons of light drift very slowly across a dark sky. Bug 1: they look blurry and blocky. The canvas never got a size, so the browser stretches its default 300 × 150 pixels over the whole screen.",
        run: true, actions: [RELOAD_WAIT],
      },
      {
        title: "Bug 1: the wallpaper is blurry",
        file: "wallpaper.js", op: "replace_line",
        anchor: "  gl.uniform2f(sizeSlot, canvas.width, canvas.height);",
        code: gl.slice("  const width = Math.round(innerWidth * devicePixelRatio);", "  gl.uniform1f(timeSlot, ms / 1000);"),
        where: "In paint(), replace the gl.uniform2f line. Now the canvas matches the window, pixel for pixel, even on a Retina screen.",
        preview: "Sharp, see-through ribbons with a bright line of light along every edge and a fine film grain, like the newest macOS wallpapers. Resize the window: it stays sharp.",
        run: true, actions: [RELOAD_WAIT],
      },
    ],
  },
  {
    name: "Menu bar",
    steps: [
      {
        title: "Menu bar markup",
        ...htmlBlock("  <!-- Menu bar -->", "  <!-- Widgets -->"),
        where: WHERE_HTML,
        preview: "Nothing to run yet.",
      },
      {
        title: "Menu bar styles",
        ...appendTo(css, "/* ---- Menu bar ---- */", ".battery {"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "A real battery icon",
        ...appendTo(css, ".battery {", "/* ---- Glass ---- */"),
        where: atEnd("style.css") + " The ::after is the little bump on the right.",
        preview: "Nothing to run yet.",
      },
      {
        title: "The clock and the icons",
        ...createFile(js, js.lines[0], "// Wi-Fi speed and battery level, straight from the browser"),
        where: "Empty file. $ is a short name for document.getElementById.",
        preview: "A see-through menu bar over the ribbons: the ⌘ logo, Finder, File, View, Go and Help on the left, Wi-Fi, a full battery, search and the live date and time on the right.",
        run: true, actions: [RELOAD_WAIT],
      },
      {
        title: "Real Wi-Fi speed and battery level",
        ...appendTo(js, "// Wi-Fi speed and battery level, straight from the browser", "// ---- Weather (free forecast from open-meteo.com, no key needed) ----"),
        where: atEnd("script.js"),
        preview: "The menu bar now shows your real network speed and battery level. The battery fills to the right width, and turns green while charging. (Chrome only, Safari keeps 100%.)",
        run: true, actions: [RELOAD_WAIT],
      },
    ],
  },
  {
    name: "Weather widget",
    steps: [
      {
        title: "Weather widget markup",
        ...htmlBlock("  <!-- Widgets -->", '    <section class="glass cleaner" id="cleaner">'),
        code: [...html.slice("  <!-- Widgets -->", '    <section class="glass cleaner" id="cleaner">'), "  </main>", ""],
        where: WHERE_HTML + " Close </main> right after the weather section; the other two widgets go in later.",
        preview: "Nothing to run yet.",
      },
      {
        title: "Frosted glass",
        ...appendTo(css, "/* ---- Glass ---- */", "/* ---- Widgets ---- */"),
        where: atEnd("style.css") + " backdrop-filter blurs whatever is behind the element.",
        preview: "Nothing to run yet.",
      },
      {
        title: "Widget layout",
        ...appendTo(css, "/* ---- Widgets ---- */", ".now {"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Weather widget styles",
        ...appendTo(css, ".now {", "/* Weather icons in colour, like Apple's */"),
        where: atEnd("style.css"),
        preview: "A frosted glass card floats over the ribbons: Cupertino, --°, a cloud and Loading... The wallpaper glows through it.",
        run: true, actions: [RELOAD_WAIT],
      },
      {
        title: "Live weather",
        ...appendTo(js, "// ---- Weather (free forecast from open-meteo.com, no key needed) ----", "// ---- Notifications ----"),
        code: swap(
          ["", ...js.slice("// ---- Weather (free forecast from open-meteo.com, no key needed) ----", "// ---- Notifications ----")],
          'const deg = (t) => Math.round(t) + "°";',
          'const deg = (t) => t + "°";',
        ),
        where: atEnd("script.js") + " Type the deg line exactly like this, it is bug 2. Change CITY to your own city and its latitude and longitude. The ° sign is ⌥⇧8.",
        preview: "The widget fills with live weather and the next 6 hours. Bug 2: the temperatures have decimals, like 27.6°, and the row looks messy.",
        run: true, actions: [RELOAD_WAIT],
      },
      {
        title: "Bug 2: temperatures with decimals",
        file: "script.js", op: "replace_line",
        anchor: 'const deg = (t) => t + "°";',
        code: ['const deg = (t) => Math.round(t) + "°";'],
        where: "In the weather section, replace the deg line. Every temperature goes through deg(), so one fix rounds them all.",
        preview: "Clean whole degrees everywhere: 28°, H:28° L:19°.",
        run: true, actions: [RELOAD_WAIT],
      },
      {
        title: "Weather icons in colour",
        ...appendTo(css, "/* Weather icons in colour, like Apple's */", "/* ---- Cleaner ---- */"),
        where: atEnd("style.css"),
        preview: "The suns turn yellow and the clouds fill in white, like Apple's Weather widget.",
        run: true, actions: [RELOAD_WAIT],
      },
    ],
  },
  {
    name: "Cleaner, notes and notifications",
    steps: [
      {
        title: "Two small widgets",
        file: "index.html", op: "insert_before_line", anchor: "  </main>",
        code: ["", ...html.slice('    <section class="glass cleaner" id="cleaner">', "  </main>")],
        where: "In index.html, right above </main>. Start with an empty line.",
        preview: "Nothing to run yet.",
      },
      {
        title: "Cleaner widget styles",
        ...appendTo(css, "/* ---- Cleaner ---- */", "/* ---- Notes widget ---- */"),
        where: atEnd("style.css") + " pathLength=\"100\" in the HTML lets the ring's progress go from 0 to 100.",
        preview: "Nothing to run yet.",
      },
      {
        title: "Notes widget styles",
        ...appendTo(css, "/* ---- Notes widget ---- */", "/* ---- Notifications ---- */"),
        where: atEnd("style.css"),
        preview: "Two square glass widgets under the weather: a cleaner with an empty ring, and a notepad that says No Notes.",
        run: true, actions: [RELOAD_WAIT],
      },
      {
        title: "A place for notifications",
        ...htmlBlock("  <!-- Notifications slide in here -->", "  <!-- The dock: script.js fills it with app icons -->"),
        where: WHERE_HTML,
        preview: "Nothing to run yet.",
      },
      {
        title: "Notification styles",
        ...appendTo(css, "/* ---- Notifications ---- */", "/* ---- Dock ---- */"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Notifications and the cleaner",
        ...appendTo(js, "// ---- Notifications ----", "// ---- Dock ----"),
        where: atEnd("script.js"),
        preview: "Click the cleaner: a soft white light pulses inside the ring while it fills up and counts to 100%. Then a notification slides in from the right: All clean.",
        run: true, actions: [RELOAD_WAIT, "click #cleaner", "wait 1400"],
      },
    ],
  },
  {
    name: "The dock",
    steps: [
      {
        title: "Dock markup",
        ...htmlBlock("  <!-- The dock: script.js fills it with app icons -->", "  <!-- App windows open in here -->"),
        where: WHERE_HTML,
        preview: "Nothing to run yet.",
      },
      {
        title: "Dock styles",
        ...appendTo(css, "/* ---- Dock ---- */", ".app::before {"),
        where: atEnd("style.css") + " --size is how big each icon is. JavaScript changes it when the mouse is near.",
        preview: "Nothing to run yet.",
      },
      {
        title: "Name tags and the open-app dot",
        ...appendTo(css, ".app::before {", "/* ---- Windows ---- */"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Fill the dock and magnify it",
        ...appendTo(js, "// ---- Dock ----", 'dock.addEventListener("click", (e) => {'),
        where: atEnd("script.js") + " The icons come from the icons folder you copied in.",
        preview: "A glass dock with seven app icons. Move the mouse along it: the icons swell around the pointer like a real Mac, and each one shows its name.",
        run: true, actions: [RELOAD_WAIT, "move 600 860", "move 740 860", "wait 400"],
      },
    ],
  },
  {
    name: "Windows",
    steps: [
      {
        title: "The Finder window",
        ...htmlBlock("  <!-- App windows open in here -->", '  <template id="notes-app">'),
        where: WHERE_HTML + " A <template> is not shown. JavaScript copies it into a window.",
        preview: "Nothing to run yet.",
      },
      {
        title: "Window frame",
        ...appendTo(css, "/* ---- Windows ---- */", ".titlebar {"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Title bar and traffic lights",
        ...appendTo(css, ".titlebar {", ".content {"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Maximise, minimise and close",
        ...appendTo(css, ".content {", "/* ---- Sidebar (Finder and Notes) ---- */"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Sidebar and Finder styles",
        ...appendTo(css, "/* ---- Sidebar (Finder and Notes) ---- */", "/* ---- Notes app ---- */"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Open a window",
        file: "script.js", op: "append",
        code: ["", ...js.slice('dock.addEventListener("click", (e) => {', "function focusWindow(win) {")]
          .filter((line) => !OPEN_CHECK.includes(line)),
        where: atEnd("script.js") + " Leave out nothing: the missing check at the top of openWindow is bug 3.",
        preview: "Nothing to run yet. One more step.",
      },
      {
        title: "Focus, close, minimise and drag",
        ...appendTo(js, "function focusWindow(win) {", "// ---- Notes ----"),
        where: atEnd("script.js"),
        preview: "Click Finder in the dock: it bounces and a Finder window zooms open, with a sidebar and your project files. Drag it by the title bar. Bug 3: click Finder again and a second window opens on top.",
        run: true, actions: [RELOAD_WAIT, "click .app[data-app=finder]", "wait 700", "click .app[data-app=finder]", "wait 900"],
      },
      {
        title: "Bug 3: one window per app",
        file: "script.js", op: "insert_after_line", anchor: "function openWindow(id) {",
        code: OPEN_CHECK,
        where: "At the top of openWindow, right below its first line. If the app already has a window, bring that one forward instead.",
        preview: "Click Finder as often as you like: one window. Click the yellow light: the window shrinks into its dock icon. Click the dock icon: it comes back.",
        run: true, actions: [RELOAD_WAIT, "click .app[data-app=finder]", "wait 700", "click .app[data-app=finder]", "wait 900"],
      },
    ],
  },
  {
    name: "Notes app",
    steps: [
      {
        title: "Notes window",
        ...htmlBlock('  <template id="notes-app">', '  <template id="terminal-app">'),
        where: WHERE_HTML,
        preview: "Nothing to run yet.",
      },
      {
        title: "Notes styles",
        ...appendTo(css, "/* ---- Notes app ---- */", "/* ---- Terminal ---- */"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Notes that are saved",
        ...appendTo(js, "// ---- Notes ----", "// ---- Terminal ----"),
        where: atEnd("script.js") + " localStorage keeps the notes after a reload.",
        preview: "Click + on the notepad widget and type. The Notes window saves as you type, and the widget shows your newest note. Reload the page: your notes are still there.",
        run: true,
        actions: [RELOAD_WAIT, "click #quickNote", "wait 500", "type Video ideas", "key Enter",
          "type A macOS desktop in the browser, with a live shader wallpaper.", "wait 300"],
      },
    ],
  },
  {
    name: "Terminal",
    steps: [
      {
        title: "Terminal window",
        ...htmlBlock('  <template id="terminal-app">', '  <template id="calculator-app">'),
        where: WHERE_HTML,
        preview: "Nothing to run yet.",
      },
      {
        title: "Terminal styles",
        ...appendTo(css, "/* ---- Terminal ---- */", "/* ---- Calculator ---- */"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Commands",
        ...appendTo(js, "// ---- Terminal ----", "SETUP.terminal = function (win) {"),
        where: atEnd("script.js") + " Each command is a function that returns the text to print.",
        preview: "Nothing to run yet.",
      },
      {
        title: "A working terminal",
        ...appendTo(js, "SETUP.terminal = function (win) {", "// ---- Calculator ----"),
        where: atEnd("script.js"),
        preview: "Open Terminal from the dock and type neofetch, then weather. It prints facts about your real computer and the live weather.",
        run: true,
        actions: [RELOAD_WAIT, "click .app[data-app=terminal]", "wait 600", "type neofetch", "key Enter",
          "type weather", "key Enter", "wait 300"],
      },
    ],
  },
  {
    name: "Calculator",
    steps: [
      {
        title: "Calculator keys",
        ...htmlBlock('  <template id="calculator-app">', '  <template id="settings-app">'),
        where: WHERE_HTML + " &divide;, &times; and &minus; are HTML names for ÷, × and −.",
        preview: "Nothing to run yet.",
      },
      {
        title: "Calculator styles",
        ...appendTo(css, "/* ---- Calculator ---- */", "/* ---- Settings and About ---- */"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Do the maths",
        ...appendTo(js, "// ---- Calculator ----", "// ---- Settings: wallpapers ----"),
        where: atEnd("script.js"),
        preview: "Open Calculator from the dock and tap 1 2 × 7 =. It shows 84, with round orange keys just like the Mac.",
        run: true,
        actions: [RELOAD_WAIT, "click .app[data-app=calculator]", "wait 600", "click .keys [data-key='1']",
          "click .keys [data-key='2']", "click .keys [data-key='*']", "click .keys [data-key='7']",
          "click .keys [data-key='=']", "wait 300"],
      },
    ],
  },
  {
    name: "Settings and About",
    steps: [
      {
        title: "Settings and About windows",
        ...htmlBlock('  <template id="settings-app">', "  <!-- Spotlight search -->"),
        where: WHERE_HTML,
        preview: "Nothing to run yet.",
      },
      {
        title: "Settings styles",
        ...appendTo(css, "/* ---- Settings and About ---- */", '.window[data-app="about"] {'),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "About styles",
        ...appendTo(css, '.window[data-app="about"] {', "/* ---- Spotlight ---- */"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Wallpaper colours",
        ...appendTo(js, "// ---- Settings: wallpapers ----", "// ---- Spotlight (Cmd+K) ----"),
        where: atEnd("script.js"),
        preview: "Open System Settings from the dock and pick Aurora: the whole desktop fades from midnight blue to green in a second and a half, glass and all.",
        run: true,
        actions: [RELOAD_WAIT, "click .app[data-app=settings]", "wait 500", "click .swatch:nth-child(4)", "wait 1900"],
      },
    ],
  },
  {
    name: "Spotlight and menus",
    steps: [
      {
        title: "Spotlight markup",
        ...htmlBlock("  <!-- Spotlight search -->", "  <!-- Drop-down and right-click menus -->"),
        where: WHERE_HTML,
        preview: "Nothing to run yet.",
      },
      {
        title: "Spotlight styles",
        ...appendTo(css, "/* ---- Spotlight ---- */", "/* ---- Menus ---- */"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Search apps and do sums",
        ...appendTo(js, "// ---- Spotlight (Cmd+K) ----", "// ---- Menus ----"),
        where: atEnd("script.js"),
        preview: "Press ⌘K and type 12 * 7 + 3: Spotlight answers 87. Type ter and press Enter: Terminal opens. Esc closes it.",
        run: true, actions: [RELOAD_WAIT, "key Meta+k", "type 12 * 7 + 3", "wait 300"],
      },
      {
        title: "Menu markup",
        ...htmlBlock("  <!-- Drop-down and right-click menus -->", "  <!-- Boot screen: shows for 3 seconds when the page loads -->"),
        where: WHERE_HTML,
        preview: "Nothing to run yet.",
      },
      {
        title: "Menu styles",
        ...appendTo(css, "/* ---- Menus ---- */", "/* ---- Boot screen ---- */"),
        where: atEnd("style.css"),
        preview: "Nothing to run yet.",
      },
      {
        title: "Menus that work",
        ...appendTo(js, "// ---- Menus ----", "// ---- Welcome ----"),
        where: atEnd("script.js"),
        preview: "Click the ⌘ logo and choose About This Mac: a window with your real screen, processor and memory. Right-click the desktop for New Note, Change Wallpaper and Clean Up.",
        run: true, actions: [RELOAD_WAIT, "click .logo", "wait 200", "click .menu button", "wait 600", "rightclick 1150 520", "wait 300"],
      },
    ],
  },
  {
    name: "Boot screen",
    steps: [
      {
        title: "Boot screen markup",
        ...htmlBlock("  <!-- Boot screen: shows for 3 seconds when the page loads -->", LUCIDE),
        where: WHERE_HTML,
        preview: "Nothing to run yet.",
      },
      {
        title: "Boot animation",
        ...appendTo(css, "/* ---- Boot screen ---- */"),
        where: atEnd("style.css") + " After the boot, the widgets and the dock rise into place one by one.",
        preview: "Nothing to run yet.",
      },
      {
        title: "Welcome back",
        ...appendTo(js, "// ---- Welcome ----"),
        where: atEnd("script.js") + " This is the last line of code.",
        preview: "Reload: a black screen, the ⌘ logo and a loading bar, like a Mac starting up. Then the desktop fades in, the widgets rise into place and a Welcome back notification slides in.",
        run: true, actions: ["wait 1500"],
      },
    ],
  },
];

// The finished desktop, for the intro and finish pages
export const FINAL_SHOTS = [
  { caption: "After the boot", actions: ["wait 4400", "move 760 860", "wait 400"] },
  {
    caption: "Apps open",
    actions: ["wait 4500", "click #quickNote", "wait 400", "type Video ideas", "key Enter",
      "type A macOS desktop in the browser.", "click .app[data-app=terminal]", "wait 500", "type neofetch",
      "key Enter", "click .app[data-app=calculator]", "wait 500", "click .keys [data-key='8']",
      "click .keys [data-key='4']", "wait 300"],
  },
  {
    caption: "Aurora wallpaper",
    actions: ["wait 4500", "eval setWallpaper(3)", "wait 1800", "click .app[data-app=finder]", "wait 700"],
  },
];
