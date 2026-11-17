// Find puzzle-worthy windows of code in a GitHub repository.
//
//   GITHUB_TOKEN=... node scripts/scout.mjs <Language> <owner/repo> <dir-or-file> [more dirs...]
//
// Lists the files in each directory at the repository's current commit, and
// prints candidate 14-line windows as JSON lines: { lang, repo, sha, path,
// start, end, code }. Pick the good ones and add them to data/puzzles.json
// (with the repository's license), then run `npm run check`.

import { LANGUAGES } from "../src/languages.js";
import { SNIPPET_LINES, leaks } from "../src/puzzles.js";

const [langName, repo, ...dirs] = process.argv.slice(2);
const lang = LANGUAGES.find((l) => l.name === langName);
if (!lang || !repo || !dirs.length) {
  console.error("usage: node scripts/scout.mjs <Language> <owner/repo> <dir-or-file>...");
  process.exit(2);
}

const headers = { "User-Agent": "polyguess-scout", Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function api(path) {
  const r = await fetch(`https://api.github.com/${path}`, { headers });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

const sha = (await api(`repos/${repo}/commits/HEAD`)).sha;
const files = [];
for (const dir of dirs) {
  const listing = await api(`repos/${repo}/contents/${dir}?ref=${sha}`);
  for (const f of Array.isArray(listing) ? listing : [listing]) {
    if (f.type === "file" && lang.ext.some((e) => f.name.endsWith(e)) && f.size > 1500 && f.size < 400_000) files.push(f);
  }
}
files.sort((a, b) => a.path.localeCompare(b.path));

const comment = new RegExp(`^\\s*(${lang.comments.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
const indent = (l) => l.match(/^\s*/)[0].replace(/\t/g, "    ").length;

let found = 0;
for (const f of files.slice(0, 12)) {
  const text = await (await fetch(`https://raw.githubusercontent.com/${repo}/${sha}/${f.path}`)).text();
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const words = [...repo.toLowerCase().split(/[/._-]/), ...f.path.toLowerCase().split(/[/._-]/)].filter((w) => w.length >= 4);
  let taken = 0;
  for (let i = 0; i + SNIPPET_LINES <= lines.length && taken < 3; i++) {
    const w = lines.slice(i, i + SNIPPET_LINES);
    const blank = w.filter((l) => !l.trim()).length;
    const comments = w.filter((l) => comment.test(l)).length;
    const minIndent = Math.min(...w.filter((l) => l.trim()).map(indent));
    if (blank > 2 || comments > 2) continue;
    if (w.some((l) => l.replace(/\t/g, "    ").length > 72)) continue;
    if (!w[0].trim() || comment.test(w[0]) || indent(w[0]) !== minIndent || /^\s*[)\]}]/.test(w[0])) continue;
    if (w.slice(0, 4).some((l) => /^\s*(import|#include|use |using |require|package |module |from \S+ import|library\(|open )/.test(l))) continue;
    const code = w.join("\n");
    if (leaks(code, lang) || words.some((x) => new RegExp(`(^|[^a-z])${x}([^a-z]|$)`, "i").test(code))) continue;
    console.log(JSON.stringify({ lang: lang.name, repo, sha, path: f.path, start: i + 1, end: i + SNIPPET_LINES, code }));
    found++;
    taken++;
    i += SNIPPET_LINES * 2;
  }
}
console.error(`${found} candidates from ${files.length} files`);
