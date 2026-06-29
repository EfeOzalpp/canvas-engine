export interface GridConfig {
  horizon: number;
  rows: number;
}

export const fallback: GridConfig = {
  rows: 12,
  horizon: 0.6,
};