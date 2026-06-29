export function selectBrightnessAdd(k: number, darkMode: boolean): number {
  return darkMode ? k * 0.2 : k * 0.05;
}

export function selectScale(k: number): number {
  return 1 + k * 0.2;
}
