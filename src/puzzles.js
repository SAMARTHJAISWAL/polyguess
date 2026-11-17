// What a puzzle is, and the rules every snippet must follow.

import { LANGUAGES, byName } from "./languages.js";

/** Every snippet is this many lines long. */
export const SNIPPET_LINES = 14;

/** Lines shown before guess 1, 2, ... 6. A wrong guess reveals more. */
export const REVEAL = [3, 5, 7, 9, 11, 14];

/** Licenses that allow these short, credited excerpts. */
export const LICENSES = [
  "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "Zlib",
  "Unlicense", "BSL-1.0", "Artistic-2.0", "PostgreSQL", "MIT OR Apache-2.0", "Unlicense OR MIT",
];

// Aliases that are also everyday words in code.
const GENERIC = ["node", "shell", "scheme"];

// Words that would give the answer away (or point at a wrong one).
const NAMES = [
  ...LANGUAGES.flatMap((l) => [l.name, ...l.aka]).filter((n) => n.length >= 4 && !GENERIC.includes(n)),
  "golang", "kotlinx", "rustc", "cargo", "pyhton", "javac", "dotnet", "erlang",
  "ruby", "lua", "php", "elm", "nim", "zig", "dart", "perl",
];
const NAME_RE = new RegExp(
  `(^|[^a-z])(${[...new Set(NAMES.map((n) => n.toLowerCase()))].map((n) => n.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&")).join("|")})([^a-z]|$)`,
  "i",
);
const EXT_RE = new RegExp(`\\.(${[...new Set(LANGUAGES.flatMap((l) => l.ext).filter(Boolean).map((e) => e.slice(1)))].filter((e) => e.length >= 2).join("|")})\\b`);

/** A reason the code gives the language away, or null. */
export function leaks(code) {
  const name = NAME_RE.exec(code);
  if (name) return `names a language: "${name[2]}"`;
  if (/copyright|license|spdx|https?:\/\/|@author/i.test(code)) return "has a licence header or link";
  const ext = EXT_RE.exec(code);
  if (ext) return `mentions a file extension: "${ext[0]}"`;
  if (/^#!/.test(code)) return "has a shebang";
  return null;
}

/** Problems with a puzzle entry (an empty list means it's fine). */
export function problems(p) {
  const out = [];
  for (const k of ["lang", "repo", "sha", "path", "license", "code"]) if (typeof p[k] !== "string" || !p[k]) out.push(`missing ${k}`);
  if (!byName.has(p.lang)) out.push(`unknown language ${p.lang}`);
  if (!/^[0-9a-f]{40}$/.test(p.sha || "")) out.push("sha must be a full commit hash");
  if (!LICENSES.includes(p.license)) out.push(`license ${p.license} is not on the list`);
  if (!(p.end - p.start === SNIPPET_LINES - 1)) out.push(`must span ${SNIPPET_LINES} lines`);
  if (typeof p.code === "string") {
    if (p.code.split("\n").length !== SNIPPET_LINES) out.push(`code must be ${SNIPPET_LINES} lines`);
    const leak = leaks(p.code);
    if (leak) out.push(leak);
  }
  return out;
}

/** The link to the exact lines on GitHub. */
export function sourceUrl(p) {
  return `https://github.com/${p.repo}/blob/${p.sha}/${p.path}#L${p.start}-L${p.end}`;
}
