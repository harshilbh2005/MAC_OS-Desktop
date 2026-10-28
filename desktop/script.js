// A macOS desktop in the browser. Plain JavaScript, no frameworks.
// Small icons come from Lucide: every <i data-lucide="name"> turns into an icon.

const $ = (id) => document.getElementById(id);

// ---- Menu bar ----

function tick() {
  const now = new Date();
  $("clock").textContent = now
    .toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    })
    .replaceAll(",", "");
}

tick();
setInterval(tick, 1000);
lucide.createIcons();

// Wi-Fi speed and battery level, straight from the browser
function showSpeed() {
  const speed = navigator.connection?.downlink;
  $("speed").textContent = speed ? speed + " Mbps" : "";
}

showSpeed();
navigator.connection?.addEventListener("change", showSpeed);

navigator.getBattery?.().then((battery) => {
  function showBattery() {
    const level = Math.round(battery.level * 100);
    $("battery").textContent = level + "%";
    $("batteryLevel").style.width = level + "%";
    $("batteryLevel").parentElement.classList.toggle("charging", battery.charging);
  }
  showBattery();
  battery.addEventListener("levelchange", showBattery);
  battery.addEventListener("chargingchange", showBattery);
});

// ---- Weather (free forecast from open-meteo.com, no key needed) ----

const CITY = { name: "Cupertino", lat: 37.32, lon: -122.03 };   // put your city here

// Turn a weather code into words and an icon
function sky(code, isDay) {
  if (code === 0) return isDay ? ["Sunny", "sun"] : ["Clear", "moon"];
  if (code <= 2) return ["Partly Cloudy", isDay ? "cloud-sun" : "cloud-moon"];
  if (code === 3) return ["Cloudy", "cloud"];
  if (code <= 48) return ["Foggy", "cloud-fog"];
  if (code <= 57) return ["Drizzle", "cloud-drizzle"];
  if (code <= 67 || (code >= 80 && code <= 82)) return ["Rain", "cloud-rain"];
  if (code <= 86) return ["Snow", "cloud-snow"];
  return ["Thunderstorms", "cloud-lightning"];
}

const deg = (t) => Math.round(t) + "°";

async function loadWeather(announce) {
  const url = "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${CITY.lat}&longitude=${CITY.lon}&timezone=auto&forecast_days=2` +
    "&current=temperature_2m,weather_code,is_day" +
    "&hourly=temperature_2m,weather_code,is_day" +
    "&daily=temperature_2m_max,temperature_2m_min";
  try {
    const { current, hourly, daily } = await (await fetch(url)).json();
    const [text, icon] = sky(current.weather_code, current.is_day);
    $("city").textContent = CITY.name;
    $("temp").textContent = deg(current.temperature_2m);
    $("skyText").textContent = text;
    $("skyIcon").innerHTML = `<i data-lucide="${icon}"></i>`;
    $("highLow").textContent =
      `H:${deg(daily.temperature_2m_max[0])} L:${deg(daily.temperature_2m_min[0])}`;

    // The next 6 hours, starting with this one
    const first = hourly.time.findIndex((time) => time >= current.time.slice(0, 13));
    let hours = "";
    for (let i = first; i < first + 6; i++) {
      const [, hourIcon] = sky(hourly.weather_code[i], hourly.is_day[i]);
      const time = new Date(hourly.time[i]).toLocaleTimeString("en-US", { hour: "numeric" });
      hours += `<li>
        <small>${i === first ? "Now" : time}</small>
        <i data-lucide="${hourIcon}"></i>
        <span>${deg(hourly.temperature_2m[i])}</span>
      </li>`;
    }
    $("hours").innerHTML = hours;
    lucide.createIcons();
    if (announce) notify("weather", CITY.name, `${deg(current.temperature_2m)} and ${text.toLowerCase()}`);
  } catch {
    $("skyText").textContent = "Offline";
  }
}

loadWeather();
setInterval(loadWeather, 15 * 60 * 1000);   // every 15 minutes

// ---- Notifications ----

function notify(app, title, text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<img src="icons/${app}.svg" alt=""><div><b>${title}</b><p>${text}</p></div>`;
  $("toasts").append(toast);
  setTimeout(() => toast.classList.add("hide"), 4000);
  setTimeout(() => toast.remove(), 4500);
}

// ---- Cleaner ----

let cleaning = false;

function clean() {
  if (cleaning) return;
  cleaning = true;
  let progress = 0;
  $("cleaner").classList.add("busy");
  const timer = setInterval(() => {
    progress = Math.min(100, progress + Math.random() * 4);
    $("ring").style.strokeDashoffset = 100 - progress;
    $("cleanText").textContent = `Cleaning... ${Math.floor(progress)}%`;
    if (progress < 100) return;
    clearInterval(timer);
    const freed = (1 + Math.random() * 3).toFixed(1);
    $("cleaner").classList.remove("busy");
    $("cleanText").textContent = freed + " GB freed";
    notify("trash", "All clean", `${freed} GB of junk files removed.`);
    cleaning = false;
  }, 60);
}

$("cleaner").addEventListener("click", clean);

// ---- Dock ----

const APPS = [
  { id: "finder", name: "Finder" },
  { id: "notes", name: "Notes" },
  { id: "terminal", name: "Terminal" },
  { id: "calculator", name: "Calculator" },
  { id: "weather", name: "Weather" },
  { id: "settings", name: "System Settings" },
  { id: "trash", name: "Trash" },
];

const dock = $("dock");

dock.innerHTML = APPS.map((app) => `
  ${app.id === "trash" ? "<hr>" : ""}
  <button class="app" data-app="${app.id}" data-name="${app.name}">
    <img src="icons/${app.id}.svg" alt="">
  </button>`).join("");

const dockIcon = (id) => dock.querySelector(`[data-app="${id}"]`);

// Icons near the mouse grow, like on a real Mac
dock.addEventListener("mousemove", (e) => {
  for (const icon of dock.querySelectorAll(".app")) {
    const box = icon.getBoundingClientRect();
    const distance = Math.abs(e.clientX - (box.left + box.width / 2));
    const grow = Math.max(0, 1 - distance / 200);
    icon.style.setProperty("--size", 54 + 30 * grow + "px");
  }
});

dock.addEventListener("mouseleave", () => {
  for (const icon of dock.querySelectorAll(".app")) icon.style.removeProperty("--size");
});

dock.addEventListener("click", (e) => {
  const icon = e.target.closest(".app");
  if (!icon) return;
  icon.animate(
    [{ translate: "0 0" }, { translate: "0 -22px" }, { translate: "0 0" }],
    { duration: 450, iterations: 2, easing: "ease-in-out" },
  );
  openApp(icon.dataset.app);
});

// ---- Windows ----

const SETUP = {};   // what each app does when its window opens
let topZ = 1;

function openApp(id) {
  if (id === "weather") return loadWeather(true);
  if (id === "trash") return clean();
  openWindow(id);
}

function openWindow(id) {
  const open = document.querySelector(`.window[data-app="${id}"]`);
  if (open) return focusWindow(open);
  const template = $(id + "-app");
  if (!template) return;

  const win = document.createElement("section");
  win.className = "window";
  win.dataset.app = id;
  win.innerHTML = `
    <header class="titlebar">
      <div class="lights">
        <button class="close"><i data-lucide="x"></i></button>
        <button class="minimize"><i data-lucide="minus"></i></button>
        <button class="maximize"><i data-lucide="maximize-2"></i></button>
      </div>
      <span>${APPS.find((app) => app.id === id)?.name ?? ""}</span>
    </header>
    <div class="content"></div>`;
  win.querySelector(".content").append(template.content.cloneNode(true));
  $("windows").append(win);

  // Open in the middle of the screen, a little lower for each open window
  const offset = document.querySelectorAll(".window").length * 26;
  win.style.left = (innerWidth - win.offsetWidth) / 2 + offset + "px";
  win.style.top = (innerHeight - win.offsetHeight) / 2 - 40 + offset + "px";

  win.querySelector(".close").onclick = () => closeWindow(win);
  win.querySelector(".minimize").onclick = () => minimizeWindow(win);
  win.querySelector(".maximize").onclick = () => win.classList.toggle("maximized");
  win.querySelector(".titlebar").ondblclick = () => win.classList.toggle("maximized");
  win.addEventListener("pointerdown", () => focusWindow(win));
  makeDraggable(win);
  SETUP[id]?.(win);
  lucide.createIcons();
  dockIcon(id)?.classList.add("open");
  focusWindow(win);
}

function focusWindow(win) {
  win.classList.remove("minimized");
  win.style.zIndex = ++topZ;
  for (const other of document.querySelectorAll(".window")) {
    other.classList.toggle("active", other === win);
  }
  $("appName").textContent = win.querySelector(".titlebar span").textContent || "Finder";
}

function closeWindow(win) {
  if (!win) return;
  win.classList.add("closing");
  setTimeout(() => win.remove(), 200);
  dockIcon(win.dataset.app)?.classList.remove("open");
  $("appName").textContent = "Finder";
}

// Shrink the window into its dock icon
function minimizeWindow(win) {
  const from = win.getBoundingClientRect();
  const to = (dockIcon(win.dataset.app) || dock).getBoundingClientRect();
  win.style.setProperty("--to-x", to.x + to.width / 2 - (from.x + from.width / 2) + "px");
  win.style.setProperty("--to-y", to.y - (from.y + from.height / 2) + "px");
  win.classList.add("minimized");
  $("appName").textContent = "Finder";
}

function makeDraggable(win) {
  const bar = win.querySelector(".titlebar");
  bar.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    const dx = e.clientX - win.offsetLeft;
    const dy = e.clientY - win.offsetTop;
    win.classList.add("dragging");
    bar.setPointerCapture(e.pointerId);
    bar.onpointermove = (e) => {
      win.style.left = e.clientX - dx + "px";
      win.style.top = Math.max(28, e.clientY - dy) + "px";   // never under the menu bar
    };
    bar.onpointerup = () => {
      bar.onpointermove = null;
      win.classList.remove("dragging");
    };
  });
}

// ---- Finder ----

SETUP.finder = function (win) {
  const items = win.querySelectorAll(".sidebar button");
  for (const item of items) {
    item.onclick = () => {
      items.forEach((other) => other.classList.toggle("active", other === item));
    };
  }
};

// ---- Notes ----

let notes = JSON.parse(localStorage.getItem("notes") || "[]");   // newest first
let current = 0;

function saveNotes() {
  localStorage.setItem("notes", JSON.stringify(notes));
  const [title, ...lines] = (notes[0] ?? "").split("\n");
  $("noteTitle").textContent = notes.length ? title || "New Note" : "No Notes";
  $("notePreview").textContent = notes.length
    ? lines.join(" ") || "No additional text"
    : "Tap to create your first note...";
}

saveNotes();

SETUP.notes = function (win) {
  const list = win.querySelector(".note-list");
  const editor = win.querySelector("textarea");
  if (!notes.length) notes.push("");

  function show() {
    list.innerHTML = "";
    notes.forEach((note, i) => {
      const item = document.createElement("button");
      item.textContent = note.split("\n")[0] || "New Note";
      item.classList.toggle("active", i === current);
      item.onclick = () => {
        current = i;
        show();
      };
      list.append(item);
    });
    editor.value = notes[current];
  }

  win.querySelector(".new-note").onclick = () => {
    if (notes[0]) notes.unshift("");
    current = 0;
    show();
    editor.focus();
  };

  editor.oninput = () => {
    notes[current] = editor.value;
    list.children[current].textContent = editor.value.split("\n")[0] || "New Note";
    saveNotes();
  };

  show();
};

function newNote() {
  openWindow("notes");
  document.querySelector(`.window[data-app="notes"] .new-note`).click();
}

$("notesWidget").onclick = () => openWindow("notes");
$("quickNote").onclick = (e) => {
  e.stopPropagation();
  newNote();
};

// ---- Terminal ----

// Facts about this computer, from the browser
function specs() {
  return [
    ["Display", `${screen.width} x ${screen.height}`],
    ["Processor", navigator.hardwareConcurrency + " cores"],
    ["Memory", (navigator.deviceMemory || "?") + " GB"],
    ["Language", navigator.language],
    ["Time zone", Intl.DateTimeFormat().resolvedOptions().timeZone],
  ];
}

const COMMANDS = {
  help: () => "Try: " + Object.keys(COMMANDS).join(", "),
  date: () => new Date().toString(),
  whoami: () => "guest",
  echo: (...words) => words.join(" "),
  weather: () => `${CITY.name}: ${$("temp").textContent}, ${$("skyText").textContent}`,
  neofetch: () => ["guest@macbook", "-------------"]
    .concat(specs().map(([name, value]) => `${name}: ${value}`))
    .join("\n"),
  open: (id) => {
    openApp(id);
    return "Opening " + id + "...";
  },
};

SETUP.terminal = function (win) {
  const output = win.querySelector(".term-output");
  const input = win.querySelector("input");

  function print(text) {
    const line = document.createElement("div");
    line.textContent = text;
    output.append(line);
  }

  print("Last login: " + new Date().toDateString() + " on ttys000");
  print('Type "help" to see what I can do.');

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const [name, ...args] = input.value.trim().split(/\s+/);
    print("guest@macbook ~ % " + input.value);
    input.value = "";
    if (name === "clear") output.innerHTML = "";
    else if (COMMANDS[name]) print(COMMANDS[name](...args));
    else if (name) print("zsh: command not found: " + name);
    win.querySelector(".content").scrollTop = 1e6;
  });

  win.addEventListener("click", () => input.focus());
  setTimeout(() => input.focus());
};

// ---- Calculator ----

// Work out a sum like "12*7+3". Only digits and + - * / . ( ) get this far.
function calculate(math) {
  try {
    return String(Number(Function("return " + (math || 0))().toFixed(8)));
  } catch {
    return "Error";
  }
}

SETUP.calculator = function (win) {
  const screen = win.querySelector(".screen");
  let math = "";    // what JavaScript works out, like 12*7
  let shown = "";   // what you see on the screen, like 12×7

  win.querySelector(".keys").addEventListener("click", (e) => {
    const key = e.target.dataset.key;
    if (!key) return;
    if (key === "C") math = shown = "";
    else if (key === "=") math = shown = calculate(math);
    else if (key === "%") math = shown = calculate(`(${math || 0})/100`);
    else if (key === "N") math = shown = calculate(`-(${math || 0})`);
    else {
      math += key;
      shown += e.target.textContent;
    }
    screen.textContent = shown || "0";
  });
};

// ---- Settings: wallpapers ----

const WALLPAPERS = [
  { name: "Midnight", hue: 0 },
  { name: "Lilac", hue: 55 },
  { name: "Sunset", hue: 165 },
  { name: "Aurora", hue: 290 },
];
let wallpaper = 0;

function setWallpaper(i) {
  wallpaper = i % WALLPAPERS.length;
  document.body.style.setProperty("--hue", WALLPAPERS[wallpaper].hue + "deg");
  localStorage.setItem("wallpaper", wallpaper);
  document.querySelectorAll(".swatch").forEach((swatch, j) => {
    swatch.classList.toggle("active", j === wallpaper);
  });
}

setWallpaper(Number(localStorage.getItem("wallpaper")) || 0);

SETUP.settings = function (win) {
  win.querySelector(".swatches").innerHTML = WALLPAPERS.map((paper, i) => `
    <button class="swatch" style="--hue: ${paper.hue}deg" onclick="setWallpaper(${i})">
      <span></span>${paper.name}
    </button>`).join("");
  setWallpaper(wallpaper);
};

// ---- About This Mac ----

SETUP.about = function (win) {
  win.querySelector("dl").innerHTML = specs()
    .map(([name, value]) => `<dt>${name}</dt><dd>${value}</dd>`)
    .join("");
};

// ---- Spotlight (Cmd+K) ----

const spotInput = $("spotInput");

function toggleSpotlight(show = $("spotlight").hidden) {
  $("spotlight").hidden = !show;
  if (!show) return;
  spotInput.value = "";
  search();
  spotInput.focus();
}

function search() {
  const query = spotInput.value.trim();
  let html = "";

  // Maths, like 12 * 7
  if (/^[\d\s.+\-*/()]+$/.test(query) && /\d/.test(query)) {
    html += `<li class="answer">= ${calculate(query)}</li>`;
  }

  for (const app of APPS) {
    if (!app.name.toLowerCase().includes(query.toLowerCase())) continue;
    html += `<li data-app="${app.id}"><img src="icons/${app.id}.svg" alt="">${app.name}</li>`;
  }
  $("results").innerHTML = html;
}

spotInput.addEventListener("input", search);

spotInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("results").querySelector("[data-app]")?.click();
});

$("results").addEventListener("click", (e) => {
  const item = e.target.closest("[data-app]");
  if (!item) return;
  toggleSpotlight(false);
  openApp(item.dataset.app);
});

$("spotlight").addEventListener("click", (e) => {
  if (e.target.id === "spotlight") toggleSpotlight(false);
});

$("searchButton").addEventListener("click", () => toggleSpotlight());

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    toggleSpotlight();
  }
  if (e.key === "Escape") toggleSpotlight(false);
});

// ---- Menus ----

const MENUS = {
  logo: [
    ["About This Mac", () => openWindow("about")],
    ["System Settings...", () => openWindow("settings")],
    "-",
    ["Restart...", () => location.reload()],
  ],
  file: [
    ["New Note", newNote],
    ["New Terminal Window", () => openWindow("terminal")],
    "-",
    ["Close Window", () => closeWindow(document.querySelector(".window.active"))],
  ],
  view: WALLPAPERS.map((paper, i) => [paper.name + " Wallpaper", () => setWallpaper(i)]),
  go: APPS.map((app) => [app.name, () => openApp(app.id)]),
  help: [
    ["Keyboard Shortcuts", () => notify("finder", "Shortcuts", "Cmd+K opens Spotlight, Esc closes it.")],
  ],
  desktop: [
    ["New Note", newNote],
    ["Change Wallpaper", () => setWallpaper(wallpaper + 1)],
    ["Clean Up", clean],
    "-",
    ["Open Terminal", () => openWindow("terminal")],
  ],
};

const menu = $("menu");

function showMenu(items, x, y) {
  menu.innerHTML = items
    .map((item, i) => (item === "-" ? "<hr>" : `<button data-i="${i}">${item[0]}</button>`))
    .join("");
  menu.hidden = false;
  menu.style.left = Math.min(x, innerWidth - menu.offsetWidth - 8) + "px";
  menu.style.top = Math.min(y, innerHeight - menu.offsetHeight - 8) + "px";
  menu.onclick = (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    menu.hidden = true;
    items[button.dataset.i][1]();
  };
}

document.querySelector(".menus").addEventListener("click", (e) => {
  const button = e.target.closest("[data-menu]");
  if (!button) return;
  const box = button.getBoundingClientRect();
  showMenu(MENUS[button.dataset.menu], box.left, box.bottom + 4);
});

document.addEventListener("contextmenu", (e) => {
  if (e.target.closest(".window, .dock, .menubar")) return;
  e.preventDefault();
  showMenu(MENUS.desktop, e.clientX, e.clientY);
});

document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest(".menu, [data-menu]")) menu.hidden = true;
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") menu.hidden = true;
});

// ---- Welcome ----

setTimeout(() => {
  notify("finder", "Welcome back", "Press Cmd+K to search, or right-click the desktop.");
}, 3800);
