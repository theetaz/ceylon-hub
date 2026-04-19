import type {
  CircleLayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl"

export const CITIES_SOURCE_ID = "cities"
export const CITIES_CIRCLE_LAYER_ID = "cities-circle"
export const CITIES_LABEL_LAYER_ID = "cities-label"

type Mode = "light" | "dark"

type CitiesTheme = {
  circleColor: string
  circleStroke: string
  labelColor: string
  labelHalo: string
}

const CITIES_THEMES: Record<Mode, CitiesTheme> = {
  light: {
    circleColor: "#1e293b",
    circleStroke: "#ffffff",
    labelColor: "#0f172a",
    labelHalo: "#ffffff",
  },
  dark: {
    circleColor: "#f8fafc",
    circleStroke: "#0f172a",
    labelColor: "#f1f5f9",
    labelHalo: "#0b1220",
  },
}

export function citiesTheme(mode: Mode) {
  return CITIES_THEMES[mode]
}

export function citiesCircleLayer(mode: Mode): CircleLayerSpecification {
  const theme = citiesTheme(mode)
  return {
    id: CITIES_CIRCLE_LAYER_ID,
    type: "circle",
    source: CITIES_SOURCE_ID,
    layout: { visibility: "none" },
    paint: {
      "circle-color": theme.circleColor,
      "circle-stroke-color": theme.circleStroke,
      "circle-stroke-width": 1,
      "circle-opacity": [
        "case",
        ["==", ["get", "place"], "city"],
        0.95,
        ["==", ["get", "place"], "town"],
        0.85,
        0.65,
      ],
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        ["case", ["==", ["get", "place"], "city"], 4, ["==", ["get", "place"], "town"], 2, 0],
        9,
        ["case", ["==", ["get", "place"], "city"], 5, ["==", ["get", "place"], "town"], 3, 1.5],
        12,
        ["case", ["==", ["get", "place"], "city"], 6, ["==", ["get", "place"], "town"], 4, 2.5],
      ],
    },
  }
}

export function citiesLabelLayer(mode: Mode): SymbolLayerSpecification {
  const theme = citiesTheme(mode)
  return {
    id: CITIES_LABEL_LAYER_ID,
    type: "symbol",
    source: CITIES_SOURCE_ID,
    layout: {
      visibility: "none",
      "text-field": ["coalesce", ["get", "name"], ""],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        ["case", ["==", ["get", "place"], "city"], 11, 0],
        9,
        ["case", ["==", ["get", "place"], "city"], 13, ["==", ["get", "place"], "town"], 10, 0],
        12,
        ["case", ["==", ["get", "place"], "city"], 14, ["==", ["get", "place"], "town"], 12, 10],
      ],
      "text-font": ["Open Sans Regular"],
      "text-anchor": "top",
      "text-offset": [0, 0.6],
      "text-optional": true,
      "text-allow-overlap": false,
      "symbol-sort-key": [
        "case",
        ["==", ["get", "place"], "city"],
        1,
        ["==", ["get", "place"], "town"],
        2,
        3,
      ],
    },
    paint: {
      "text-color": theme.labelColor,
      "text-halo-color": theme.labelHalo,
      "text-halo-width": 1.4,
      "text-halo-blur": 0.5,
    },
  }
}
