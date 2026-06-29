import { useState } from "react";
import { CanvasInstance } from "./canvas-core/lifecycle/instantiator";
import { WidthSlider } from "./WidthSlider";

function App() {
  const [widthA, setWidthA] = useState(700);

  return (
    <div>
      <div style={{ width: "100vw", height: "100vh" }}>
        <CanvasInstance
          id="b"
          dprMode="cap3"
          viewportMode={{ kind: "parent" }}
          fpsCap={60}
          zIndex={1}
          visible
        />
      </div>
      <WidthSlider onChange={setWidthA} />
      <div style={{ width: widthA, height: "100vh" }}>
        <CanvasInstance
          id="a"
          dprMode="cap3"
          viewportMode={{ kind: "parent" }}
          fpsCap={60}
          zIndex={1}
          visible
        />
      </div>
    </div>
  );
}

export default App;