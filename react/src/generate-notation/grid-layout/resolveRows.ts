const MIN_WEIGHT = 0.15;
const MAX_WEIGHT = 3.0;

export interface ResolveRowsInput {
  height: number;
  rows: number;
  horizon: number; // 0..1 measured from bottom of canvas
}

export interface ResolveRowsOutput {
  height: number;
  topRowHeights: number[];
  bottomRowHeights: number[];
  topRowPositions: number[];    // y from canvas bottom, integer px
  bottomRowPositions: number[]; // y from canvas bottom, integer px
}

function perspectiveWeights(n: number, reversed: boolean): number[] {
  if (n === 1) return [1];
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return reversed
      ? MIN_WEIGHT + (MAX_WEIGHT - MIN_WEIGHT) * (1 - t)
      : MIN_WEIGHT + (MAX_WEIGHT - MIN_WEIGHT) * t;
  });
}

// Cumulative snapping: boundaries are rounded integers so adjacent cells share exact edges.
function snappedLayout(weights: number[], totalH: number, startY: number) {
  const totalW = weights.reduce((a, b) => a + b, 0);
  let cumW = 0;
  const positions: number[] = [];
  const heights: number[] = [];

  for (const w of weights) {
    const pos = startY + Math.round((cumW / totalW) * totalH);
    cumW += w;
    const nextPos = startY + Math.round((cumW / totalW) * totalH);
    positions.push(pos);
    heights.push(nextPos - pos);
  }

  return { positions, heights };
}

export function resolveRows(input: ResolveRowsInput): ResolveRowsOutput {
  const { height, rows, horizon } = input;

  const bottomHeight = Math.round(height * horizon);
  const topHeight = height - bottomHeight;

  const halfRows = Math.floor(rows / 2);
  const extra = rows % 2;

  let topRows: number;
  let bottomRows: number;
  if (extra === 0) {
    topRows = halfRows;
    bottomRows = halfRows;
  } else {
    if (bottomHeight >= topHeight) {
      bottomRows = halfRows + 1;
      topRows = halfRows;
    } else {
      topRows = halfRows + 1;
      bottomRows = halfRows;
    }
  }

  // Bottom: MAX at ground (index 0), MIN at horizon (index n-1)
  const bottomWeights = perspectiveWeights(bottomRows, true);
  const { positions: bottomRowPositions, heights: bottomRowHeights } =
    snappedLayout(bottomWeights, bottomHeight, 0);

  // Top: MIN at horizon (index 0), MAX at sky (index n-1)
  const topWeights = perspectiveWeights(topRows, false);
  const { positions: topRowPositions, heights: topRowHeights } =
    snappedLayout(topWeights, topHeight, bottomHeight);

  return { height, topRowHeights, bottomRowHeights, topRowPositions, bottomRowPositions };
}