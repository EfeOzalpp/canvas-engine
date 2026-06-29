import { indexFromAvg, usedRowsFromSpec } from "../buildGrid";

describe("indexFromAvg", () => {
  test.each([
    [0,   10, 0], // lower bound
    [1,   10, 9], // upper bound
    [0.5, 10, 5], // midpoint
    [-1,  10, 0], // clamps below 0
    [2,   10, 9], // clamps above 1
    [NaN, 10, 5], // non-finite falls back to 0.5
    [0,    1, 0], // single item - always 0
    [1,    1, 0], // single item - always 0
  ])("avg=%s total=%s -> %s", (avg, total, expected) => {
    expect(indexFromAvg(avg, total)).toBe(expected);
  });
});

describe("usedRowsFromSpec", () => {
  test.each([
    [10, 1,    10], // full grid
    [10, 0.5,   5], // half
    [10, undefined, 10], // defaults to 1
    [10, 0,     1], // clamps useTopRatio to 0.01 minimum -> at least 1 row
    [7,  0.5,   4], // rounds
  ])("rows=%s useTopRatio=%s -> %s", (rows, useTopRatio, expected) => {
    expect(usedRowsFromSpec(rows, useTopRatio)).toBe(expected);
  });
});
