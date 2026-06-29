import { resolveCols } from "../resolveCols";

describe("resolveCols", () => {
  test("returns an integer", () => {
    expect(Number.isInteger(resolveCols({ rows: 10, widthPx: 800, heightPx: 600 }))).toBe(true);
  });

  test("wider screen produces more cols than narrow screen", () => {
    const narrow = resolveCols({ rows: 10, widthPx: 320, heightPx: 600 });
    const wide = resolveCols({ rows: 10, widthPx: 1440, heightPx: 600 });
    expect(wide).toBeGreaterThan(narrow);
  });

  test("result is at least 1", () => {
    expect(resolveCols({ rows: 1, widthPx: 1, heightPx: 1 })).toBeGreaterThanOrEqual(1);
  });

  test("same input always returns same value", () => {
    const opts = { rows: 8, widthPx: 768, heightPx: 500 };
    expect(resolveCols(opts)).toBe(resolveCols(opts));
  });

  test("useTopRatio affects result", () => {
    const full = resolveCols({ rows: 10, widthPx: 800, heightPx: 600, useTopRatio: 1 });
    const half = resolveCols({ rows: 10, widthPx: 800, heightPx: 600, useTopRatio: 0.5 });
    expect(full).not.toBe(half);
  });
});
