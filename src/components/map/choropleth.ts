import type { DataDrivenPropertyValueSpecification } from "maplibre-gl"

import type { ChoroplethMode } from "@/stores/layers"

export type ChoroplethStop = {
  value: number
  color: string
  label: string
}

// Sequential palette (ColorBrewer YlOrRd-ish) tuned for Sri Lanka districts.
// Density range: Mullaitivu ~45 to Colombo ~3,400 /km².
export const DENSITY_STOPS: ChoroplethStop[] = [
  { value: 50, color: "#fff5eb", label: "< 100" },
  { value: 150, color: "#fee6ce", label: "100" },
  { value: 300, color: "#fdd0a2", label: "300" },
  { value: 600, color: "#fdae6b", label: "600" },
  { value: 1200, color: "#fd8d3c", label: "1.2 k" },
  { value: 2000, color: "#f16913", label: "2 k" },
  { value: 3400, color: "#d94801", label: "3.4 k" },
]

// Absolute population stops — small rural districts under 150k up to Colombo >2.3M.
export const POPULATION_STOPS: ChoroplethStop[] = [
  { value: 150_000, color: "#f7fcfd", label: "150 k" },
  { value: 400_000, color: "#e0ecf4", label: "400 k" },
  { value: 800_000, color: "#bfd3e6", label: "800 k" },
  { value: 1_200_000, color: "#9ebcda", label: "1.2 M" },
  { value: 1_800_000, color: "#8c96c6", label: "1.8 M" },
  { value: 2_400_000, color: "#8c6bb1", label: "2.4 M" },
  { value: 3_000_000, color: "#6e016b", label: "3 M+" },
]

export function getChoroplethStops(mode: ChoroplethMode) {
  if (mode === "density") return DENSITY_STOPS
  if (mode === "population") return POPULATION_STOPS
  return null
}

export function getChoroplethProperty(mode: ChoroplethMode) {
  if (mode === "density") return "density"
  if (mode === "population") return "population"
  return null
}

export function getChoroplethLabel(mode: ChoroplethMode) {
  if (mode === "density") return "Population density (per km²)"
  if (mode === "population") return "Population (2023)"
  return ""
}

export function buildChoroplethFillColor(
  mode: ChoroplethMode,
  fallback: string
): DataDrivenPropertyValueSpecification<string> {
  const stops = getChoroplethStops(mode)
  const prop = getChoroplethProperty(mode)
  if (!stops || !prop) return fallback

  return [
    "interpolate",
    ["linear"],
    ["to-number", ["get", prop], 0],
    ...stops.flatMap((s) => [s.value, s.color] as const),
  ] as unknown as DataDrivenPropertyValueSpecification<string>
}
