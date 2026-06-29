export interface CompiledFootprint {
  x: number;
}

export interface CompiledHeader {
  name: string | undefined;
  footprint: CompiledFootprint | undefined;
}
