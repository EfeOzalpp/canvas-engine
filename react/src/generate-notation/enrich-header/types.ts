export type PlacementBand = "top" | "bottom";

export interface PlacementLocation {
  band: PlacementBand;
  row: number;
  col: number | number[];
}

export type PlacementConfig = Record<string, PlacementLocation>;
