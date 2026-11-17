import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { byName, FAMILIES, LANGUAGES, search } from "../src/languages.js";
import { leaks, problems, REVEAL, SNIPPET_LINES, sourceUrl } from "../src/puzzles.js";
import { dayNumber, describe, judge, MAX_GUESSES, outcome, puzzleFor, record, shareText, shown, SKIP } from "../src/game.js";

const puzzles = JSON.parse(await readFile(new URL("../data/puzzles.json", import.meta.url), "utf8"));

test("day 1 is launch day, counted on the local calendar", () => {
  assert.equal(dayNumber(new Date(2026, 10, 17, 0, 1)), 1);
  assert.equal(dayNumber(new Date(2026, 10, 17, 23, 59)), 1);
  assert.equal(dayNumber(new Date(2026, 10, 18, 0, 0)), 2);
  assert.equal(dayNumber(new Date(2027, 0, 1, 12)), 46);
  // a daylight-saving change in the middle doesn't skip or repeat a day
  assert.equal(dayNumber(new Date(2027, 2, 15)) - dayNumber(new Date(2027, 2, 14)), 1);
});

test("puzzles cycle once the list runs out", () => {
  assert.equal(puzzleFor(puzzles, 1), puzzles[0]);
  assert.equal(puzzleFor(puzzles, puzzles.length), puzzles.at(-1));
  assert.equal(puzzleFor(puzzles, puzzles.length + 1), puzzles[0]);
});

test("guesses are judged right, same family, wrong or skipped", () => {
  assert.equal(judge("Rust", "Rust"), "win");
  assert.equal(judge("Zig", "Rust"), "family");
  assert.equal(judge("Python", "Rust"), "miss");
  assert.equal(judge(SKIP, "Rust"), "skip");
  assert.equal(describe("Zig", "Rust"), "Close: same family (Systems)");
  assert.equal(describe("Python", "Rust"), "Wrong family (not Scripting)");
  assert.equal(describe("Rust", "Rust"), "That's it!");
});

test("each wrong guess reveals more lines, and the end shows everything", () => {
  assert.equal(shown([], "Go", 14), 3);
  assert.equal(shown(["C"], "Go", 14), 5);
  assert.equal(shown(["C", SKIP], "Go", 14), 7);
  assert.equal(shown(["Go"], "Go", 14), 14);
  assert.equal(shown(["C", "D", "V", "Zig", "Nim", "Odin"], "Go", 14), 14);
  assert.deepEqual(REVEAL, [...REVEAL].sort((a, b) => a - b));
  assert.equal(REVEAL.at(-1), SNIPPET_LINES);
});

test("the game ends on a win or after six guesses", () => {
  assert.deepEqual(outcome(["C", "Go"], "Go"), { done: true, won: true, used: 2 });
  assert.deepEqual(outcome(["C"], "Go"), { done: false, won: false, used: 1 });
  assert.deepEqual(outcome(Array(MAX_GUESSES).fill(SKIP), "Go"), { done: true, won: false, used: 6 });
});

test("the share text has no spoilers", () => {
  const text = shareText(7, ["Python", SKIP, "Zig", "Rust"], "Rust", "https://example.com/");
  assert.equal(text, "polyguess #7 4/6 · 9 lines needed\n⬛⬜🟨🟩\nhttps://example.com/");
  assert.ok(!/rust/i.test(text.split("\n").slice(0, 2).join("")));
  const lost = shareText(8, ["C", "D", "V", "Zig", "Nim", "Odin"], "Go", "u");
  assert.equal(lost, "polyguess #8 X/6\n🟨🟨🟨🟨🟨🟨\nu");
});

test("stats count streaks and the guess spread", () => {
  let s = record({}, 1, true, 2);
  s = record(s, 2, true, 1);
  assert.equal(s.streak, 2);
  assert.deepEqual(s.spread, [1, 1, 0, 0, 0, 0]);
  assert.deepEqual(record(s, 2, true, 1), s, "the same day isn't counted twice");
  s = record(s, 4, true, 3);
  assert.equal(s.streak, 1, "a missed day resets the streak");
  s = record(s, 5, false, 6);
  assert.equal(s.streak, 0);
  assert.equal(s.best, 2);
  assert.equal(s.played, 4);
});

test("search finds languages by name and nickname", () => {
  assert.equal(search("c#")[0].name, "C#");
  assert.equal(search("csharp")[0].name, "C#");
  assert.equal(search("golang")[0].name, "Go");
  assert.equal(search("js")[0].name, "JavaScript");
  assert.equal(search("ts")[0].name, "TypeScript");
  assert.equal(search("objc")[0].name, "Objective-C");
  assert.equal(search("c")[0].name, "C");
  assert.equal(search("lisp")[0].name, "Common Lisp");
  assert.equal(search("").length, LANGUAGES.length);
  assert.deepEqual(search("zzz"), []);
});

test("every language has a family and the names are unique", () => {
  assert.equal(new Set(LANGUAGES.map((l) => l.name)).size, LANGUAGES.length);
  for (const l of LANGUAGES) assert.ok(FAMILIES[l.family], l.name);
});

test("the leak check catches giveaways", () => {
  assert.match(leaks("import kotlinx.coroutines"), /kotlinx/);
  assert.match(leaks("// a Python port"), /python/i);
  assert.match(leaks("# Copyright 2020"), /licence/);
  assert.match(leaks('load("util.rb")'), /extension/);
  assert.match(leaks("#!/bin/sh\necho hi"), /shebang/);
  assert.equal(leaks("let x = node.next"), null);
  assert.equal(leaks("for i in range(10):\n    print(i)"), null);
});

test("every puzzle is valid, credited and licensed", () => {
  for (const [i, p] of puzzles.entries()) {
    assert.deepEqual(problems(p), [], `#${i + 1} ${p.repo}/${p.path}`);
    assert.match(sourceUrl(p), /^https:\/\/github\.com\/.+#L\d+-L\d+$/);
  }
});

test("the schedule covers every language and spreads them out", () => {
  const langs = puzzles.map((p) => p.lang);
  for (const l of LANGUAGES) assert.ok(langs.includes(l.name), `no snippet in ${l.name}`);
  // the first round plays each language once before any repeats
  assert.equal(new Set(langs.slice(0, LANGUAGES.length)).size, LANGUAGES.length);
  for (let i = 1; i < puzzles.length; i++) {
    assert.notEqual(byName.get(langs[i]).family, byName.get(langs[i - 1]).family, `days ${i} and ${i + 1} share a family`);
  }
  const keys = puzzles.map((p) => `${p.repo}/${p.path}:${p.start}`);
  assert.equal(new Set(keys).size, keys.length, "no snippet twice");
});
