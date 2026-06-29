export function hoverBrightnessAdd(k: number, darkMode: boolean): number {
  return darkMode ? k * 0.15 : k * -0.02;
}
