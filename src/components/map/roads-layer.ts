import type { LineLayerSpecification } from "maplibre-gl"

export const ROADS_SOURCE_ID = "roads"
export const ROADS_CASING_LAYER_ID = "roads-casing"
export const ROADS_LINE_LAYER_ID = "roads-line"

type Mode = "light" | "dark"

type RoadsTheme = {
  motorway: string
  trunk: string
  primary: string
  secondary: string
  casing: string
}

const THEMES: Record<Mode, RoadsTheme> = {
  light: {
    motorway: "#e11d48",
    trunk: "#ea580c",
    primary: "#f59e0b",
    secondary: "#fde68a",
    casing: "#ffffff",
  },
  dark: {
    motorway: "#fb7185",
    trunk: "#fdba74",
    primary: "#fbbf24",
    secondary: "#fef3c7",
    casing: "#0f172a",
  },
}

export function roadsTheme(mode: Mode) {
  return THEMES[mode]
}

function colorExpr(theme: RoadsTheme) {
  return [
    "match",
    ["get", "highway"],
    "motorway",
    theme.motorway,
    "trunk",
    theme.trunk,
    "primary",
    theme.primary,
    "secondary",
    theme.secondary,
    theme.secondary,
  ]
}

function selectedColor(mode: Mode) {
  return mode === "dark" ? "#38bdf8" : "#0369a1"
}

// Full line-color expression: accent when the segment's feature-state
// has selected=true, class color otherwise.
export function roadsLineColor(mode: Mode) {
  return [
    "case",
    ["boolean", ["feature-state", "selected"], false],
    selectedColor(mode),
    colorExpr(roadsTheme(mode)),
  ]
}

// Line-width expression: the normal class-graduated widths. Selected
// segments rely on the color change for feedback — nesting a zoom
// interpolation inside a feature-state case is rejected by some
// MapLibre builds.
export function roadsLineWidth() {
  return widthExpr(1)
}

// Line width varies by road class and zoom level.
function widthExpr(scale: number) {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    6,
    [
      "match",
      ["get", "highway"],
      "motorway",
      2 * scale,
      "trunk",
      1.4 * scale,
      "primary",
      0.8 * scale,
      "secondary",
      0,
      0,
    ],
    9,
    [
      "match",
      ["get", "highway"],
      "motorway",
      3.5 * scale,
      "trunk",
      2.5 * scale,
      "primary",
      1.8 * scale,
      "secondary",
      1 * scale,
      0.6 * scale,
    ],
    13,
    [
      "match",
      ["get", "highway"],
      "motorway",
      7 * scale,
      "trunk",
      5.5 * scale,
      "primary",
      4 * scale,
      "secondary",
      3 * scale,
      2 * scale,
    ],
  ]
}

export function roadsCasingLayer(mode: Mode): LineLayerSpecification {
  const theme = roadsTheme(mode)
  return {
    id: ROADS_CASING_LAYER_ID,
    type: "line",
    source: ROADS_SOURCE_ID,
    layout: {
      visibility: "none",
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": theme.casing,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "line-width": widthExpr(1.6) as any,
      "line-opacity": 0.5,
    },
  }
}

export function roadsLineLayer(mode: Mode): LineLayerSpecification {
  return {
    id: ROADS_LINE_LAYER_ID,
    type: "line",
    source: ROADS_SOURCE_ID,
    layout: {
      visibility: "none",
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "line-color": roadsLineColor(mode) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "line-width": roadsLineWidth() as any,
      "line-opacity": 0.95,
    },
  }
}
