import type { CanvasBackgroundConfig } from "../../canvas-core/render-passes/instanced-passes/registry";

const config: CanvasBackgroundConfig = {
  spec: {
    base: "rgb(18, 26, 62)",
    overlay: {
      kind: "linear",
      stops: [
        { rgba: "rgb(20, 35, 68)" },
        { rgba: "rgb(49, 84, 126)" },
        { rgba: "rgb(68, 116, 179)" },
        { rgba: "rgb(79, 135, 198)" },
        { k: "horizon", rgba: "rgb(102, 158, 255)" },
        { k: "horizon", rgba: "rgb(157, 255, 239)" },
        { rgba: "rgb(147, 236, 210)" },
        { rgba: "rgb(175, 59, 198)" },
        { k: 98, rgba: "rgb(125, 201, 148)" },
        { k: 98, rgba: "#46412a" },
        { rgba: "#453628" },
      ],
    },
    stars: {
      count: [32, 54],
      topBandPct: 35,
      minR: 0.9,
      maxR: 1.6,
      alpha: [0.5, 1.5],
      flickerHz: [0.42, 0.98],
    },
  },
};

export default config;