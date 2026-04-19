import { AppShell } from "@/components/layout/app-shell"
import { FeatureSheet } from "@/components/map/feature-sheet"
import { MapCanvas } from "@/components/map/map-canvas"

export function App() {
  return (
    <>
      <AppShell>
        <MapCanvas />
      </AppShell>
      <FeatureSheet />
    </>
  )
}

export default App
