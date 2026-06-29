import { computeHorizonRowHeights } from "../horizonRowHeights";

describe("computeHorizonRowHeights", () => {
  test("rowHeights has correct length", () => {
    const { rowHeights } = computeHorizonRowHeights(600, 10, 0.5, 800);
    expect(rowHeights).toHaveLength(10);
  });

  test("rowHeights sum to totalH", () => {
    const totalH = 600;
    const { rowHeights } = computeHorizonRowHeights(totalH, 10, 0.5, 800);
    const sum = rowHeights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(totalH, 5);
  });

  test("all rowHeights are positive", () => {
    const { rowHeights } = computeHorizonRowHeights(600, 10, 0.5, 800);
    rowHeights.forEach((h) => { expect(h).toBeGreaterThan(0); });
  });

  test("rowOffsetY starts at 0", () => {
    const { rowOffsetY } = computeHorizonRowHeights(600, 10, 0.5, 800);
    expect(rowOffsetY[0]).toBe(0);
  });

  test("horizonRowIdx is within row range", () => {
    const rows = 10;
    const { horizonRowIdx } = computeHorizonRowHeights(600, rows, 0.5, 800);
    expect(horizonRowIdx).toBeGreaterThanOrEqual(0);
    expect(horizonRowIdx).toBeLessThan(rows);
  });

  test("works with odd row count", () => {
    const { rowHeights } = computeHorizonRowHeights(600, 9, 0.5, 800);
    expect(rowHeights).toHaveLength(9);
  });

  test("colsPerRow and cellWPerRow match rowHeights length", () => {
    const { rowHeights, colsPerRow, cellWPerRow } = computeHorizonRowHeights(600, 8, 0.4, 800);
    expect(colsPerRow).toHaveLength(rowHeights.length);
    expect(cellWPerRow).toHaveLength(rowHeights.length);
  });

  test("rows near horizon are smaller than rows far from it", () => {
    const { rowHeights, horizonRowIdx } = computeHorizonRowHeights(600, 10, 0.5, 800);
    expect(rowHeights[horizonRowIdx]).toBeLessThan(rowHeights[0]);
  });
});
