// The polyguess page. Rules live in game.js, languages in languages.js.
import { FAMILIES, LANGUAGES, search } from "./languages.js";
import { dayNumber, describe, judge, MAX_GUESSES, outcome, puzzleFor, record, shareText, shown, SKIP, square } from "./game.js";

const $ = (id) => document.getElementById(id);
const STORE = "polyguess:v1";

const puzzles = await (await fetch("puzzles.json")).json();

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE)) || { games: {}, stats: {} };
  } catch {
    return { games: {}, stats: {} };
  }
}

function save(state) {
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch {
    // private mode: the game still works, it just won't remember
  }
}

const today = dayNumber();
const asked = Number(new URLSearchParams(location.search).get("day"));
const n = Number.isInteger(asked) && asked >= 1 && asked <= today ? asked : today;
const practice = n !== today;
const p = puzzleFor(puzzles, n);
let state = load();
let guesses = state.games[n] || [];

function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 1800);
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

// Tabs that only indent count as 4 columns. Tabs that line up columns mid-line
// (as in assembly) were written for 8-column stops, so those snippets get 8.
const TAB = /[^\t\n]\t/.test(p.code) ? 8 : 4;

/** Expand tabs to tab stops, so tab-aligned columns stay aligned. */
function expand(line) {
  let out = "";
  for (const ch of line) out += ch === "\t" ? " ".repeat(TAB - (out.length % TAB)) : ch;
  return out;
}

/** The snippet: visible lines as text, hidden ones as bars the length of the line. */
function drawCode() {
  // drop the indentation every line shares, so more code fits on a phone
  const raw = p.code.split("\n").map(expand);
  const common = Math.min(...raw.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  const lines = raw.map((l) => l.slice(common));
  const visible = shown(guesses, p.lang, lines.length);
  const box = $("code");
  box.innerHTML = "";
  lines.forEach((line, i) => {
    const row = document.createElement("div");
    row.className = "row";
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = String(p.start + i);
    row.appendChild(num);
    if (i < visible) {
      const text = document.createElement("span");
      text.className = i >= visible - 2 && guesses.length && !outcome(guesses, p.lang).done ? "text new" : "text";
      text.textContent = line || " ";
      row.appendChild(text);
    } else {
      const indent = line.length - line.trimStart().length;
      const bar = document.createElement("span");
      bar.className = "blur";
      bar.style.marginLeft = `${indent}ch`;
      bar.style.width = `${line.trim().length}ch`;
      row.appendChild(bar);
      row.classList.add("hidden");
      row.setAttribute("aria-label", "hidden line");
    }
    box.appendChild(row);
  });
}

function draw() {
  const { done, won, used } = outcome(guesses, p.lang);
  $("day").textContent = practice ? `Practice · day ${n}` : `Day ${n}`;
  drawCode();
  const list = $("guesses");
  list.innerHTML = "";
  for (const g of guesses) {
    const li = document.createElement("li");
    li.className = judge(g, p.lang);
    li.innerHTML = `<span class="badge"></span><span class="value"></span><span class="hint"></span>`;
    li.querySelector(".badge").textContent = square(judge(g, p.lang));
    li.querySelector(".value").textContent = g === SKIP ? "Skipped" : g;
    li.querySelector(".hint").textContent = g === SKIP ? "More lines" : describe(g, p.lang);
    list.appendChild(li);
  }
  const remaining = MAX_GUESSES - guesses.length;
  $("left").textContent = done ? "" : `${remaining} guess${remaining === 1 ? "" : "es"} left · each wrong guess shows more code`;
  $("guess-form").hidden = done;
  $("result").hidden = !done;
  if (done) {
    $("verdict").textContent = won
      ? ["Three lines. Incredible.", "Sharp eyes!", "Great call!", "Nicely done!", "Got there!", "Phew, last chance!"][used - 1]
      : "Not this time.";
    $("answer").textContent = p.lang;
    const project = p.repo.split("/")[1];
    $("source").textContent = `${project} · ${p.path.split("/").pop()}, lines ${p.start}–${p.end}`;
    $("source").href = `https://github.com/${p.repo}/blob/${p.sha}/${p.path}#L${p.start}-L${p.end}`;
    $("license").textContent = `(${p.repo}, ${p.license})`;
    countdown();
  }
}

function countdown() {
  if (practice) {
    $("next").innerHTML = `<a href="./">Play today's snippet</a>`;
    return;
  }
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((midnight - now) / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  $("next").textContent = `Next snippet in ${hh}:${mm}:${ss}`;
}
setInterval(() => {
  if (!$("result").hidden) countdown();
}, 1000);

// ---------------------------------------------------------------------------
// Picking a language
// ---------------------------------------------------------------------------

let matches = [];
let active = 0;

function showMatches() {
  const input = $("guess");
  const list = $("matches");
  matches = search(input.value).filter((l) => !guesses.includes(l.name));
  active = Math.min(active, Math.max(0, matches.length - 1));
  const open = document.activeElement === input && input.value.trim() !== "" && matches.length > 0;
  list.hidden = !open;
  input.setAttribute("aria-expanded", String(open));
  list.innerHTML = "";
  matches.forEach((l, i) => {
    const li = document.createElement("li");
    li.role = "option";
    li.id = `opt-${i}`;
    li.textContent = l.name;
    if (i === active) {
      li.className = "active";
      li.setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", li.id);
    }
    li.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      submit(l.name);
    });
    list.appendChild(li);
  });
  list.querySelector(".active")?.scrollIntoView({ block: "nearest" });
}

const input = $("guess");
input.addEventListener("input", () => {
  active = 0;
  showMatches();
});
input.addEventListener("focus", showMatches);
input.addEventListener("blur", () => setTimeout(() => ($("matches").hidden = true), 100));
input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!matches.length) return;
    active = (active + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
    showMatches();
  } else if (e.key === "Escape") {
    $("matches").hidden = true;
  }
});

function submit(name) {
  if (outcome(guesses, p.lang).done) return;
  if (name !== SKIP && guesses.includes(name)) {
    toast("You already guessed that");
    return;
  }
  guesses = [...guesses, name];
  state.games[n] = guesses;
  const result = outcome(guesses, p.lang);
  if (result.done && !practice) state.stats = record(state.stats, n, result.won, result.used);
  save(state);
  input.value = "";
  active = 0;
  draw();
  if (result.done) {
    input.blur();
    $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (!practice) setTimeout(showStats, 1600);
  } else {
    if (judge(name, p.lang) === "family") toast("Close! Same family");
    showMatches();
  }
}

$("guess-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) {
    toast("Type a language, or Skip");
    return;
  }
  const pick = matches[active] || search(text)[0];
  if (!pick) {
    toast("Not one of the 47 languages");
    return;
  }
  submit(pick.name);
});

$("skip-btn").addEventListener("click", () => submit(SKIP));

$("share").addEventListener("click", async () => {
  const url = `${location.origin}${location.pathname}`;
  const text = shareText(n, guesses, p.lang, url);
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ text });
      return;
    } catch {
      // cancelled: fall back to copying
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied. Paste it anywhere!");
  } catch {
    toast("Couldn't copy");
  }
});

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

function showStats() {
  const s = { played: 0, wins: 0, streak: 0, best: 0, spread: Array(MAX_GUESSES).fill(0), ...state.stats };
  const pct = s.played ? Math.round((100 * s.wins) / s.played) : 0;
  $("stat-numbers").innerHTML = [
    [s.played, "Played"],
    [pct, "Win %"],
    [s.streak, "Streak"],
    [s.best, "Best"],
  ]
    .map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`)
    .join("");
  const max = Math.max(1, ...s.spread);
  const mine = outcome(guesses, p.lang);
  $("spread").innerHTML = s.spread
    .map((c, i) => {
      const now = !practice && mine.won && mine.used === i + 1 ? "today" : "";
      return `<div>${i + 1}<i class="${now}" style="width:${8 + (c / max) * 82}%">${c}</i></div>`;
    })
    .join("");
  $("stats").showModal();
}

function showArchive() {
  const items = [];
  for (let d = today; d >= 1; d--) {
    const g = state.games[d];
    const r = g ? outcome(g, puzzleFor(puzzles, d).lang) : null;
    const cls = r?.done ? (r.won ? "won" : "lost") : "";
    const mark = r?.done ? (r.won ? "🟩" : "🟥") : r ? "…" : "·";
    items.push(`<li><a class="${cls}" href="?day=${d}"><small>${mark}</small>${d}</a></li>`);
  }
  $("days").innerHTML = items.join("");
  $("archive").showModal();
}

$("families").innerHTML = Object.entries(FAMILIES)
  .map(([key, label]) => `<dt>${label}</dt><dd>${LANGUAGES.filter((l) => l.family === key).map((l) => l.name).join(", ")}</dd>`)
  .join("");

$("help-btn").addEventListener("click", () => $("help").showModal());
$("stats-btn").addEventListener("click", showStats);
$("archive-btn").addEventListener("click", showArchive);
for (const d of document.querySelectorAll("dialog")) {
  d.querySelector(".close").addEventListener("click", () => d.close());
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close();
  });
}

draw();
if (!state.seenHelp) {
  state.seenHelp = true;
  save(state);
  $("help").showModal();
}
