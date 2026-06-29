import { useState } from "react";

interface Props {
  onChange: (width: number) => void;
}

export function WidthSlider({ onChange }: Props) {
  const [value, setValue] = useState(700);
  return (
    <div style={{ position: "fixed", top: 8, left: 8, zIndex: 9999, background: "#000", padding: 8, color: "#fff", fontFamily: "monospace" }}>
      <div>canvas-a width: {value}px</div>
      <input
        type="range"
        min={700}
        max={1400}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          setValue(next);
          onChange(next);
        }}
      />
    </div>
  );
}