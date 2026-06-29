// Ordered specs selected by a named runtime signal.
export interface RuntimePreset<TSpec> {
  selector: "spotlightIndex";
  entries: readonly TSpec[];
}
