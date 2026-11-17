// The languages you can guess, and the families used for the 🟨 hint.
//
//   name      what the player picks
//   family    guessing another language in the same family earns a 🟨
//   ext       file extensions (used by the scout script)
//   comments  line-comment markers (used by the scout script)
//   aka       other names the search box understands

export const FAMILIES = {
  systems: "Systems",
  mobile: "Mobile & Apple",
  managed: "JVM & .NET",
  web: "Web",
  scripting: "Scripting",
  science: "Science",
  functional: "Functional (ML)",
  beam: "BEAM",
  lisp: "Lisp",
  shell: "Shell",
  special: "Specialists",
};

const L = (name, family, ext, comments, aka = []) => ({ name, family, ext, comments, aka });
const C = ["//", "/*", "*"];

export const LANGUAGES = [
  L("C", "systems", [".c", ".h"], C),
  L("C++", "systems", [".cc", ".cpp", ".hpp", ".h"], C, ["cpp", "cplusplus"]),
  L("Rust", "systems", [".rs"], ["//"]),
  L("Go", "systems", [".go"], C, ["golang"]),
  L("Zig", "systems", [".zig"], ["//"]),
  L("D", "systems", [".d"], C, ["dlang"]),
  L("Nim", "systems", [".nim"], ["#"]),
  L("Odin", "systems", [".odin"], C),
  L("V", "systems", [".v"], C, ["vlang"]),
  L("Assembly", "systems", [".S", ".s", ".asm"], [";", "//", "#", "/*"], ["asm", "x86"]),

  L("Swift", "mobile", [".swift"], ["//", "///"]),
  L("Objective-C", "mobile", [".m", ".h"], C, ["objc", "obj-c"]),
  L("Kotlin", "mobile", [".kt"], C),
  L("Dart", "mobile", [".dart"], ["//", "///"], ["flutter"]),

  L("Java", "managed", [".java"], C),
  L("C#", "managed", [".cs"], C, ["csharp", "c sharp", "dotnet"]),
  L("Scala", "managed", [".scala"], C),
  L("Groovy", "managed", [".groovy"], C),

  L("JavaScript", "web", [".js", ".mjs"], C, ["js", "node", "ecmascript"]),
  L("TypeScript", "web", [".ts"], C, ["ts"]),
  L("CoffeeScript", "web", [".coffee"], ["#"], ["coffee"]),
  L("PHP", "web", [".php"], [...C, "#"]),

  L("Python", "scripting", [".py"], ["#"], ["py"]),
  L("Ruby", "scripting", [".rb"], ["#"], ["rb"]),
  L("Perl", "scripting", [".pm", ".pl"], ["#"]),
  L("Lua", "scripting", [".lua"], ["--"]),
  L("Crystal", "scripting", [".cr"], ["#"]),

  L("R", "science", [".R", ".r"], ["#"], ["rlang"]),
  L("Julia", "science", [".jl"], ["#"]),
  L("Fortran", "science", [".f90", ".F90"], ["!"]),

  L("Haskell", "functional", [".hs"], ["--", "{-"], ["hs"]),
  L("OCaml", "functional", [".ml"], ["(*"], ["ml"]),
  L("F#", "functional", [".fs"], ["//", "(*", "///"], ["fsharp", "f sharp"]),
  L("Elm", "functional", [".elm"], ["--", "{-"]),
  L("PureScript", "functional", [".purs"], ["--", "{-"], ["purs"]),

  L("Erlang", "beam", [".erl"], ["%"]),
  L("Elixir", "beam", [".ex", ".exs"], ["#"], ["ex"]),
  L("Gleam", "beam", [".gleam"], ["//"]),

  L("Clojure", "lisp", [".clj", ".cljc"], [";"], ["clj"]),
  L("Common Lisp", "lisp", [".lisp"], [";"], ["lisp", "cl"]),
  L("Racket", "lisp", [".rkt"], [";"], ["scheme"]),

  L("Bash", "shell", [".sh", ""], ["#"], ["shell", "sh", "zsh"]),
  L("PowerShell", "shell", [".ps1", ".psm1"], ["#"], ["pwsh", "ps1"]),

  L("SQL", "special", [".sql"], ["--"], ["postgres", "postgresql", "plpgsql"]),
  L("Prolog", "special", [".pl"], ["%"]),
  L("Verilog", "special", [".v"], ["//"], ["hdl"]),
  L("Solidity", "special", [".sol"], ["//", "///", "/*", "*"], ["ethereum"]),
];

export const byName = new Map(LANGUAGES.map((l) => [l.name, l]));

/** Languages matching what the player has typed, best matches first. */
export function search(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name));
  const score = (l) => {
    const names = [l.name.toLowerCase(), ...l.aka];
    if (names.includes(q)) return 0;
    if (names.some((n) => n.startsWith(q))) return 1;
    if (names.some((n) => n.includes(q))) return 2;
    return 9;
  };
  return LANGUAGES.map((l) => [score(l), l])
    .filter(([s]) => s < 9)
    .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name))
    .map(([, l]) => l);
}
