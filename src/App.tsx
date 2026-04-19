import { AppShell } from "@/components/layout/app-shell"
import { FeatureSheet } from "@/components/map/feature-sheet"
import { MapCanvas } from "@/components/map/map-canvas"
import { MapLegend } from "@/components/map/map-legend"

export function App() {
  return (
    <>
      <AppShell>
        <MapCanvas />
        <MapLegend />
      </AppShell>
      <FeatureSheet />
    </>
  )
}

export default App
