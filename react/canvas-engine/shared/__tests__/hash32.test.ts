import { rand01FromString, phaseFromIndex } from "../hash32";

describe("rand01FromString", () => {
  test.each([
    ["hello"],
    [""],
    ["California"],
    ["LifeIsLife"],
    ["thiscanbeinteresting"],
    ["1/2{[[$#"],
    ["/)/68406fg,ssaf"],
  ])("%s", (input) => {
    const result = rand01FromString(input);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(1);
  });
});

describe("phaseFromIndex", () => {
  test.each([
    [3, 0],
    [4, 2],
    [2046743, 12467],
    [68953, 0],
    [-1, 0],
  ])("idx=%s seed=%s stays in [0, 2pi]", (idx, seed) => {
    const result = phaseFromIndex(idx, seed);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(Math.PI * 2);
  });

  test("same input always returns same value", () => {
    expect(phaseFromIndex(42, 7)).toBe(phaseFromIndex(42, 7));
  });

  test("explicit seed 0 matches default seed", () => {
    expect(phaseFromIndex(3, 0)).toBe(phaseFromIndex(3));
  });

  test("different seed produces different result", () => {
    expect(phaseFromIndex(3, 0)).not.toBe(phaseFromIndex(3, 7));
  });
});
