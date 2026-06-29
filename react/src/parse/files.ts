import { compileNotationText } from "./compiler";
import type { CompiledNotation } from "./types";

const notationSources = import.meta.glob<string>("../notation/*.txt", {
  query: "?raw",
  import: "default",
  eager: true,
});

export function compileNotationFiles(): CompiledNotation[] {
  return Object.values(notationSources).map((source) => compileNotationText(source));
}
