// Keep data/puzzles.json honest: every snippet is the exact lines of a real
// file, at a pinned commit, under a permissive licence.
//
//   node scripts/snippets.mjs          fill in `code` for entries that lack it
//   node scripts/snippets.mjs --check  re-download every snippet and compare
//
// Each entry needs lang, repo, sha, path, start and license; `end` and `code`
// are filled in from the source.

import { readFile, writeFile } from "node:fs/promises";
import { SNIPPET_LINES, problems } from "../src/puzzles.js";

const file = new URL("../data/puzzles.json", import.meta.url);
const check = process.argv.includes("--check");
const puzzles = JSON.parse(await readFile(file, "utf8"));

async function lines(p) {
  const url = `https://raw.githubusercontent.com/${p.repo}/${p.sha}/${p.path}`;
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(url);
    if (r.ok) {
      const all = (await r.text()).replace(/\r\n/g, "\n").split("\n");
      return all.slice(p.start - 1, p.start - 1 + SNIPPET_LINES).join("\n");
    }
    if (attempt >= 3) throw new Error(`${url}: ${r.status}`);
    await new Promise((ok) => setTimeout(ok, 1000 * attempt));
  }
}

let bad = 0;
await Promise.all(
  puzzles.map(async (p, i) => {
    const code = await lines(p);
    if (check) {
      if (code !== p.code) {
        bad++;
        console.error(`#${i + 1} ${p.lang} ${p.repo}/${p.path}:${p.start}: snippet differs from the source`);
      }
    } else if (!p.code) {
      p.end = p.start + SNIPPET_LINES - 1;
      p.code = code;
    }
  }),
);

for (const [i, p] of puzzles.entries()) {
  for (const problem of problems(p)) {
    bad++;
    console.error(`#${i + 1} ${p.lang} ${p.repo}/${p.path}:${p.start}: ${problem}`);
  }
}

if (!check) {
  const keys = ["lang", "repo", "sha", "path", "start", "end", "license", "code"];
  const tidy = puzzles.map((p) => Object.fromEntries(keys.map((k) => [k, p[k]])));
  await writeFile(file, `${JSON.stringify(tidy, null, 2)}\n`);
}
console.log(`${puzzles.length} snippets, ${bad} problem${bad === 1 ? "" : "s"}`);
process.exit(bad ? 1 : 0);
