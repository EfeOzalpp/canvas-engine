export type ParsedColor = readonly [r: number, g: number, b: number, a: number];

export function parseCssColor(css: string): ParsedColor {
  const trimmed = css.trim();

  const rgba = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (rgba) {
    return [
      parseInt(rgba[1], 10) / 255,
      parseInt(rgba[2], 10) / 255,
      parseInt(rgba[3], 10) / 255,
      rgba[4] !== undefined ? parseFloat(rgba[4]) : 1.0,
    ];
  }

  const hex6 = trimmed.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (hex6) {
    return [
      parseInt(hex6[1], 16) / 255,
      parseInt(hex6[2], 16) / 255,
      parseInt(hex6[3], 16) / 255,
      1.0,
    ];
  }

  const hex3 = trimmed.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
  if (hex3) {
    return [
      parseInt(hex3[1] + hex3[1], 16) / 255,
      parseInt(hex3[2] + hex3[2], 16) / 255,
      parseInt(hex3[3] + hex3[3], 16) / 255,
      1.0,
    ];
  }

  return [0, 0, 0, 1];
}