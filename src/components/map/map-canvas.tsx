import * as React from "react"
import maplibregl from "maplibre-gl"
import type {
  FeatureCollection,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson"
import type { RasterTileSource, StyleSpecification } from "maplibre-gl"

import "maplibre-gl/dist/maplibre-gl.css"

import { useTheme } from "@/components/theme-provider"

const SRI_LANKA_CENTER: [number, number] = [80.7718, 7.8731]
const SRI_LANKA_BOUNDS: [[number, number], [number, number]] = [
  [79.55, 5.85],
  [82.0, 9.9],
]
const CAMERA_BOUNDS: [[number, number], [number, number]] = [
  [72.0, -2.0],
  [92.0, 16.0],
]

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>'

const BASEMAP_SOURCE_ID = "basemap"
const BASEMAP_LAYER_ID = "basemap"
const MASK_SOURCE_ID = "sri-lanka-mask"
const MASK_LAYER_ID = "sri-lanka-mask-fill"
const OUTLINE_SOURCE_ID = "sri-lanka-outline"
const OUTLINE_LAYER_ID = "sri-lanka-outline-line"

type BasemapMode = "light" | "dark"

type BasemapConfig = {
  tiles: string[]
  seaColor: string
  outlineColor: string
  outlineOpacity: number
  outlineWidth: number
  rasterBrightnessMin: number
  rasterBrightnessMax: number
  rasterContrast: number
  rasterSaturation: number
}

const TILE_SCALE = "@2x"

const BASEMAPS: Record<BasemapMode, BasemapConfig> = {
  light: {
    tiles: [
      `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${TILE_SCALE}.png`,
      `https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${TILE_SCALE}.png`,
      `https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${TILE_SCALE}.png`,
    ],
    seaColor: "#b3dcf2",
    outlineColor: "#1f3a4d",
    outlineOpacity: 0.7,
    outlineWidth: 1.2,
    rasterBrightnessMin: 0,
    rasterBrightnessMax: 1,
    rasterContrast: 0,
    rasterSaturation: 0,
  },
  dark: {
    tiles: [
      `https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${TILE_SCALE}.png`,
      `https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${TILE_SCALE}.png`,
      `https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${TILE_SCALE}.png`,
    ],
    seaColor: "#0d1a27",
    outlineColor: "#7fb3d6",
    outlineOpacity: 0.75,
    outlineWidth: 1.0,
    rasterBrightnessMin: 0.08,
    rasterBrightnessMax: 1,
    rasterContrast: 0.15,
    rasterSaturation: 0.1,
  },
}

function buildInitialStyle(mode: BasemapMode): StyleSpecification {
  const basemap = BASEMAPS[mode]
  return {
    version: 8,
    sources: {
      [BASEMAP_SOURCE_ID]: {
        type: "raster",
        tiles: basemap.tiles,
        tileSize: 256,
        attribution: `${OSM_ATTRIBUTION} ${CARTO_ATTRIBUTION}`,
      },
    },
    layers: [
      {
        id: BASEMAP_LAYER_ID,
        type: "raster",
        source: BASEMAP_SOURCE_ID,
        minzoom: 0,
        maxzoom: 22,
        paint: {
          "raster-brightness-min": basemap.rasterBrightnessMin,
          "raster-brightness-max": basemap.rasterBrightnessMax,
          "raster-contrast": basemap.rasterContrast,
          "raster-saturation": basemap.rasterSaturation,
        },
      },
    ],
  }
}

function resolveMode(theme: string): BasemapMode {
  if (theme === "dark") return "dark"
  if (theme === "light") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function collectPolygonRings(geometry: Polygon | MultiPolygon): Position[][] {
  if (geometry.type === "Polygon") return geometry.coordinates
  return geometry.coordinates.flat()
}

function buildMask(
  country: FeatureCollection<Polygon | MultiPolygon>
): FeatureCollection<Polygon> {
  const worldRing: Position[] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ]
  const holes = country.features.flatMap((f) => collectPolygonRings(f.geometry))

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [worldRing, ...holes],
        },
      },
    ],
  }
}

async function loadBoundary() {
  const res = await fetch("/geo/country.geojson")
  if (!res.ok) throw new Error(`Boundary load failed: ${res.status}`)
  const country = (await res.json()) as FeatureCollection<Polygon | MultiPolygon>
  return { mask: buildMask(country), outline: country }
}

function addOverlays(
  map: maplibregl.Map,
  data: {
    mask: FeatureCollection<Polygon>
    outline: FeatureCollection<Polygon | MultiPolygon>
  },
  mode: BasemapMode
) {
  const basemap = BASEMAPS[mode]

  if (!map.getSource(MASK_SOURCE_ID)) {
    map.addSource(MASK_SOURCE_ID, { type: "geojson", data: data.mask })
  }
  if (!map.getLayer(MASK_LAYER_ID)) {
    map.addLayer({
      id: MASK_LAYER_ID,
      type: "fill",
      source: MASK_SOURCE_ID,
      paint: {
        "fill-color": basemap.seaColor,
        "fill-opacity": 1,
      },
    })
  }

  if (!map.getSource(OUTLINE_SOURCE_ID)) {
    map.addSource(OUTLINE_SOURCE_ID, { type: "geojson", data: data.outline })
  }
  if (!map.getLayer(OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: "line",
      source: OUTLINE_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": basemap.outlineColor,
        "line-width": basemap.outlineWidth,
        "line-opacity": basemap.outlineOpacity,
      },
    })
  }
}

function applyMode(map: maplibregl.Map, mode: BasemapMode) {
  const basemap = BASEMAPS[mode]

  const source = map.getSource(BASEMAP_SOURCE_ID) as RasterTileSource | undefined
  if (source && "setTiles" in source) {
    source.setTiles(basemap.tiles)
  }

  if (map.getLayer(BASEMAP_LAYER_ID)) {
    map.setPaintProperty(
      BASEMAP_LAYER_ID,
      "raster-brightness-min",
      basemap.rasterBrightnessMin
    )
    map.setPaintProperty(
      BASEMAP_LAYER_ID,
      "raster-brightness-max",
      basemap.rasterBrightnessMax
    )
    map.setPaintProperty(BASEMAP_LAYER_ID, "raster-contrast", basemap.rasterContrast)
    map.setPaintProperty(
      BASEMAP_LAYER_ID,
      "raster-saturation",
      basemap.rasterSaturation
    )
  }

  if (map.getLayer(MASK_LAYER_ID)) {
    map.setPaintProperty(MASK_LAYER_ID, "fill-color", basemap.seaColor)
  }
  if (map.getLayer(OUTLINE_LAYER_ID)) {
    map.setPaintProperty(OUTLINE_LAYER_ID, "line-color", basemap.outlineColor)
    map.setPaintProperty(OUTLINE_LAYER_ID, "line-width", basemap.outlineWidth)
    map.setPaintProperty(OUTLINE_LAYER_ID, "line-opacity", basemap.outlineOpacity)
  }
}

function fitSriLanka(map: maplibregl.Map, duration = 0) {
  map.fitBounds(SRI_LANKA_BOUNDS, { padding: 48, duration })
}

export function MapCanvas() {
  const { theme } = useTheme()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<maplibregl.Map | null>(null)
  const readyRef = React.useRef(false)

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const mode = resolveMode(theme)
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildInitialStyle(mode),
      center: SRI_LANKA_CENTER,
      zoom: 7,
      minZoom: 5,
      maxZoom: 16,
      maxBounds: CAMERA_BOUNDS,
      attributionControl: { compact: true },
    })

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      "top-right"
    )
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }),
      "bottom-left"
    )

    fitSriLanka(map)

    const onResize = () => fitSriLanka(map, 200)
    window.addEventListener("resize", onResize)

    let cancelled = false
    map.once("load", () => {
      if (cancelled) return
      loadBoundary()
        .then((data) => {
          if (cancelled || !mapRef.current) return
          addOverlays(map, data, resolveMode(theme))
          readyRef.current = true
        })
        .catch((err: unknown) => {
          console.warn("Failed to load Sri Lanka boundary", err)
        })
    })

    mapRef.current = map

    return () => {
      cancelled = true
      window.removeEventListener("resize", onResize)
      map.remove()
      mapRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => applyMode(map, resolveMode(theme))
    if (map.loaded()) apply()
    else map.once("load", apply)
  }, [theme])

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="size-full" />
    </div>
  )
}
