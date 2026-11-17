// The rules of polyguess: one snippet a day, six guesses, and a wrong guess
// reveals more of the code.

import { byName, FAMILIES } from "./languages.js";
import { REVEAL } from "./puzzles.js";

export const MAX_GUESSES = REVEAL.length;

/** A guess that skips: it costs a turn and reveals more lines. */
export const SKIP = "";

/** Day 1 of polyguess. Each local calendar day after it is the next puzzle. */
export const LAUNCH = { year: 2026, month: 11, day: 17 };

const DAY_MS = 86_400_000;

/** The puzzle number for a date (1 on launch day), using the local calendar. */
export function dayNumber(date = new Date()) {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const launch = Date.UTC(LAUNCH.year, LAUNCH.month - 1, LAUNCH.day);
  return Math.floor((today - launch) / DAY_MS) + 1;
}

/** The puzzle for a day number. Puzzles repeat once the list runs out. */
export function puzzleFor(puzzles, n) {
  const i = (((n - 1) % puzzles.length) + puzzles.length) % puzzles.length;
  return puzzles[i];
}

/**
 * How a guess compares with the answer:
 *   "win"    the right language
 *   "family" a close relative (same family), shown as 🟨
 *   "miss"   wrong, shown as ⬛
 *   "skip"   no guess, shown as ⬜
 */
export function judge(guess, answer) {
  if (guess === SKIP) return "skip";
  if (guess === answer) return "win";
  const g = byName.get(guess);
  const a = byName.get(answer);
  return g && a && g.family === a.family ? "family" : "miss";
}

const SQUARES = { win: "🟩", family: "🟨", miss: "⬛", skip: "⬜" };

export function square(verdict) {
  return SQUARES[verdict];
}

/** Words for a guess: "Close: same family (Systems)". */
export function describe(guess, answer) {
  const v = judge(guess, answer);
  if (v === "win") return "That's it!";
  if (v === "skip") return "Skipped";
  if (v === "family") return `Close: same family (${FAMILIES[byName.get(answer).family]})`;
  const family = FAMILIES[byName.get(guess)?.family];
  return family ? `Wrong family (not ${family})` : "Wrong";
}

/** Whether a list of guesses has finished the game, and how. */
export function outcome(guesses, answer) {
  const i = guesses.findIndex((g) => g === answer);
  if (i >= 0) return { done: true, won: true, used: i + 1 };
  return { done: guesses.length >= MAX_GUESSES, won: false, used: guesses.length };
}

/** How many lines of the snippet to show. All of them once the game is over. */
export function shown(guesses, answer, total) {
  if (outcome(guesses, answer).done) return total;
  return Math.min(total, REVEAL[guesses.length]);
}

/** The spoiler-free text people paste. */
export function shareText(n, guesses, answer, url) {
  const { won, used } = outcome(guesses, answer);
  const squares = guesses.slice(0, used).map((g) => square(judge(g, answer))).join("");
  const lines = REVEAL[used - 1];
  const how = won ? `${used}/${MAX_GUESSES} · ${lines} lines needed` : `X/${MAX_GUESSES}`;
  return `polyguess #${n} ${how}\n${squares}\n${url}`;
}

/** Update stats after a finished daily puzzle. */
export function record(stats, n, won, used) {
  const s = {
    played: 0, wins: 0, streak: 0, best: 0, last: 0,
    spread: Array(MAX_GUESSES).fill(0), ...stats,
  };
  if (s.last === n) return s; // already counted
  s.played += 1;
  if (won) {
    s.wins += 1;
    s.streak = s.last === n - 1 ? s.streak + 1 : 1;
    s.best = Math.max(s.best, s.streak);
    s.spread = s.spread.map((c, i) => (i === used - 1 ? c + 1 : c));
  } else {
    s.streak = 0;
  }
  s.last = n;
  return s;
}
