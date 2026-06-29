import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './global.css'
import { compileNotationFiles } from './parse/index.ts'
import { resolveLocation, getPlacementCanvasIds } from './generate-notation/enrich-header/index.ts'

const compiledShapes = compileNotationFiles()
const gridInput = { width: 700, height: 700, rows: 12, horizon: 0.6 }

for (const canvasId of getPlacementCanvasIds()) {
    const locatedShapes = resolveLocation(canvasId, compiledShapes, gridInput)
    console.log(`[canvas-engine] ${canvasId}`, locatedShapes)
}

createRoot(document.getElementById('root')!).render(
    <App />
)
