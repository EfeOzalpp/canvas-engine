import { villaSlide } from "./01-villa";
import { busSlide } from "./02-bus";
import { seaSlide } from "./03-sea";
import { cloudsSlide } from "./04-clouds";
import { snowSlide } from "./05-snow";
import { houseSlide } from "./06-house";
import { powerSlide } from "./07-power";
import { sunSlide } from "./08-sun";
import { carSlide } from "./09-car";
import { carFactorySlide } from "./10-car-factory";
import { treesSlide } from "./11-trees";
import type { SpotlightSlide } from "../types";

// File names carry the authored order; this array is the runtime order.
export const SPOTLIGHT_SLIDES = [
  villaSlide,
  busSlide,
  powerSlide,
  seaSlide,
  carFactorySlide,
  cloudsSlide,
  treesSlide,
  sunSlide,
  snowSlide,
  houseSlide,
  carSlide,
] as const satisfies readonly SpotlightSlide[];

export type { SpotlightSlide } from "../types";
