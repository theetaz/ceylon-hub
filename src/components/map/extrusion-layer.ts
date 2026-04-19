import type { FillExtrusionLayerSpecification } from "maplibre-gl"

import { DENSITY_STOPS } from "@/components/map/choropleth"

export const EXTRUSION_LAYER_ID = "admin-districts-extrusion"
export const EXTRUSION_SOURCE_ID = "admin-districts"

// 3D extrusion height: scale by population. Max district (Colombo ~2.3M)
// should be visually striking but not dwarf the island.
// Use a linear interpolation that maps 100k → 500 m, 2.5M → 25km.
const HEIGHT_PER_PERSON = 0.01

export function extrusionLayer(
  mode: "light" | "dark"
): FillExtrusionLayerSpecification {
  const stops = DENSITY_STOPS
  return {
    id: EXTRUSION_LAYER_ID,
    type: "fill-extrusion",
    source: EXTRUSION_SOURCE_ID,
    layout: { visibility: "none" },
    paint: {
      // color by density (same palette as choropleth)
      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        ["to-number", ["get", "density"], 0],
        ...stops.flatMap((s) => [s.value, s.color] as const),
      ],
      "fill-extrusion-height": [
        "*",
        ["to-number", ["get", "population"], 0],
        HEIGHT_PER_PERSON,
      ],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": mode === "dark" ? 0.85 : 0.9,
    },
  } as FillExtrusionLayerSpecification
}
