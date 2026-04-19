import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl"

export type OsmLayerId =
  | "railways"
  | "airports"
  | "hospitals"
  | "education"
  | "waterways"
  | "protected-areas"

type Mode = "light" | "dark"

type ThemeColor = { light: string; dark: string }

function pick(color: ThemeColor, mode: Mode) {
  return color[mode]
}

const THEME = {
  rail: { light: "#475569", dark: "#cbd5e1" },
  station: { light: "#1e293b", dark: "#f8fafc" },
  airport: { light: "#ea580c", dark: "#fb923c" },
  hospital: { light: "#dc2626", dark: "#f87171" },
  school: { light: "#2563eb", dark: "#60a5fa" },
  university: { light: "#7c3aed", dark: "#a78bfa" },
  riverLine: { light: "#0284c7", dark: "#38bdf8" },
  waterFill: { light: "#7dd3fc", dark: "#0c4a6e" },
  waterOutline: { light: "#0284c7", dark: "#38bdf8" },
  parkFill: { light: "#22c55e", dark: "#16a34a" },
  parkOutline: { light: "#15803d", dark: "#86efac" },
  labelText: { light: "#0f172a", dark: "#f1f5f9" },
  labelHalo: { light: "#ffffff", dark: "#0b1220" },
}

// ------------- RAILWAYS (lines + station points) -------------

export function railwayLineLayer(mode: Mode): LineLayerSpecification {
  return {
    id: "osm-railways-line",
    type: "line",
    source: "osm-railways",
    filter: ["==", ["geometry-type"], "LineString"],
    layout: {
      visibility: "none",
      "line-cap": "butt",
      "line-join": "round",
    },
    paint: {
      "line-color": pick(THEME.rail, mode),
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        0.8,
        10,
        1.5,
        14,
        2.5,
      ],
      "line-dasharray": [2, 2],
      "line-opacity": 0.9,
    },
  }
}

export function railwayStationLayer(mode: Mode): CircleLayerSpecification {
  return {
    id: "osm-railways-station",
    type: "circle",
    source: "osm-railways",
    filter: ["==", ["geometry-type"], "Point"],
    layout: { visibility: "none" },
    paint: {
      "circle-color": pick(THEME.station, mode),
      "circle-stroke-color": pick(THEME.labelHalo, mode),
      "circle-stroke-width": 1.2,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        7,
        2,
        10,
        3,
        13,
        4,
      ],
    },
  }
}

// ------------- AIRPORTS (points) -------------

export function airportCircleLayer(mode: Mode): CircleLayerSpecification {
  return {
    id: "osm-airports-circle",
    type: "circle",
    source: "osm-airports",
    layout: { visibility: "none" },
    paint: {
      "circle-color": pick(THEME.airport, mode),
      "circle-stroke-color": pick(THEME.labelHalo, mode),
      "circle-stroke-width": 1.4,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        4,
        10,
        6,
        13,
        8,
      ],
    },
  }
}

// ------------- HOSPITALS (points) -------------

export function hospitalCircleLayer(mode: Mode): CircleLayerSpecification {
  return {
    id: "osm-hospitals-circle",
    type: "circle",
    source: "osm-hospitals",
    layout: { visibility: "none" },
    paint: {
      "circle-color": pick(THEME.hospital, mode),
      "circle-stroke-color": pick(THEME.labelHalo, mode),
      "circle-stroke-width": 1,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        7,
        ["case", ["==", ["get", "kind"], "hospital"], 3, 1.5],
        12,
        ["case", ["==", ["get", "kind"], "hospital"], 5, 3],
      ],
      "circle-opacity": 0.9,
    },
  }
}

// ------------- EDUCATION (points) -------------

export function educationCircleLayer(mode: Mode): CircleLayerSpecification {
  return {
    id: "osm-education-circle",
    type: "circle",
    source: "osm-education",
    layout: { visibility: "none" },
    paint: {
      "circle-color": [
        "match",
        ["get", "kind"],
        "university",
        pick(THEME.university, mode),
        "college",
        pick(THEME.university, mode),
        pick(THEME.school, mode),
      ],
      "circle-stroke-color": pick(THEME.labelHalo, mode),
      "circle-stroke-width": 1,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        7,
        [
          "match",
          ["get", "kind"],
          "university",
          3,
          "college",
          2.5,
          1.2,
        ],
        12,
        [
          "match",
          ["get", "kind"],
          "university",
          6,
          "college",
          5,
          3,
        ],
      ],
      "circle-opacity": 0.85,
    },
  }
}

// ------------- WATERWAYS (rivers as lines + water bodies as fills) -------------

export function waterFillLayer(mode: Mode): FillLayerSpecification {
  return {
    id: "osm-waterways-fill",
    type: "fill",
    source: "osm-waterways",
    filter: ["==", ["geometry-type"], "Polygon"],
    layout: { visibility: "none" },
    paint: {
      "fill-color": pick(THEME.waterFill, mode),
      "fill-opacity": 0.65,
    },
  }
}

export function waterOutlineLayer(mode: Mode): LineLayerSpecification {
  return {
    id: "osm-waterways-outline",
    type: "line",
    source: "osm-waterways",
    filter: ["==", ["geometry-type"], "Polygon"],
    layout: { visibility: "none" },
    paint: {
      "line-color": pick(THEME.waterOutline, mode),
      "line-width": 0.5,
      "line-opacity": 0.7,
    },
  }
}

export function riverLineLayer(mode: Mode): LineLayerSpecification {
  return {
    id: "osm-waterways-line",
    type: "line",
    source: "osm-waterways",
    filter: ["==", ["geometry-type"], "LineString"],
    layout: {
      visibility: "none",
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": pick(THEME.riverLine, mode),
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        0.6,
        10,
        1.3,
        14,
        2.2,
      ],
      "line-opacity": 0.75,
    },
  }
}

// ------------- PROTECTED AREAS (polygons) -------------

export function protectedFillLayer(mode: Mode): FillLayerSpecification {
  return {
    id: "osm-protected-fill",
    type: "fill",
    source: "osm-protected-areas",
    layout: { visibility: "none" },
    paint: {
      "fill-color": pick(THEME.parkFill, mode),
      "fill-opacity": mode === "dark" ? 0.2 : 0.18,
    },
  }
}

export function protectedOutlineLayer(mode: Mode): LineLayerSpecification {
  return {
    id: "osm-protected-outline",
    type: "line",
    source: "osm-protected-areas",
    layout: { visibility: "none" },
    paint: {
      "line-color": pick(THEME.parkOutline, mode),
      "line-width": 0.8,
      "line-opacity": 0.7,
    },
  }
}

// ------------- dataset wiring -------------

export type OsmDatasetConfig = {
  id: OsmLayerId
  sourceId: string
  path: string
  featureCount: number
  layers: Array<{
    spec: (mode: Mode) =>
      | CircleLayerSpecification
      | LineLayerSpecification
      | FillLayerSpecification
      | SymbolLayerSpecification
    /** Whether this layer is inserted below roads (background-ish) or above. */
    beneathRoads?: boolean
  }>
}

export const OSM_DATASETS: Record<OsmLayerId, OsmDatasetConfig> = {
  railways: {
    id: "railways",
    sourceId: "osm-railways",
    path: "/geo/railways.geojson",
    featureCount: 1618,
    layers: [
      { spec: railwayLineLayer },
      { spec: railwayStationLayer },
    ],
  },
  airports: {
    id: "airports",
    sourceId: "osm-airports",
    path: "/geo/airports.geojson",
    featureCount: 30,
    layers: [{ spec: airportCircleLayer }],
  },
  hospitals: {
    id: "hospitals",
    sourceId: "osm-hospitals",
    path: "/geo/hospitals.geojson",
    featureCount: 1228,
    layers: [{ spec: hospitalCircleLayer }],
  },
  education: {
    id: "education",
    sourceId: "osm-education",
    path: "/geo/education.geojson",
    featureCount: 5390,
    layers: [{ spec: educationCircleLayer }],
  },
  waterways: {
    id: "waterways",
    sourceId: "osm-waterways",
    path: "/geo/waterways.geojson",
    featureCount: 3919,
    layers: [
      { spec: waterFillLayer, beneathRoads: true },
      { spec: waterOutlineLayer, beneathRoads: true },
      { spec: riverLineLayer, beneathRoads: true },
    ],
  },
  "protected-areas": {
    id: "protected-areas",
    sourceId: "osm-protected-areas",
    path: "/geo/protected-areas.geojson",
    featureCount: 66,
    layers: [
      { spec: protectedFillLayer, beneathRoads: true },
      { spec: protectedOutlineLayer, beneathRoads: true },
    ],
  },
}

export const OSM_COLORS: Record<OsmLayerId, ThemeColor> = {
  railways: THEME.rail,
  airports: THEME.airport,
  hospitals: THEME.hospital,
  education: THEME.school,
  waterways: THEME.riverLine,
  "protected-areas": THEME.parkFill,
}
