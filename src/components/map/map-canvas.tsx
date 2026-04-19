import * as React from "react"
import maplibregl from "maplibre-gl"
import type {
  FeatureCollection,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson"
import type { StyleSpecification } from "maplibre-gl"

import "maplibre-gl/dist/maplibre-gl.css"

import { useTheme } from "@/components/theme-provider"

const SRI_LANKA_CENTER: [number, number] = [80.7718, 7.8731]
const SRI_LANKA_BOUNDS: [[number, number], [number, number]] = [
  [79.55, 5.85],
  [82.0, 9.9],
]
const SRI_LANKA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [79.4, 5.7],
  [82.1, 10.05],
]

const RASTER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'

const MASK_SOURCE_ID = "sri-lanka-mask"
const MASK_LAYER_ID = "sri-lanka-mask-fill"

type BasemapMode = "light" | "dark"

function buildStyle(mode: BasemapMode): StyleSpecification {
  const tiles =
    mode === "dark"
      ? [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        ]
      : [
          "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        ]

  return {
    version: 8,
    sources: {
      "carto-basemap": {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution: `${RASTER_ATTRIBUTION} &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>`,
      },
    },
    layers: [
      {
        id: "carto-basemap",
        type: "raster",
        source: "carto-basemap",
        minzoom: 0,
        maxzoom: 22,
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

function maskColor(mode: BasemapMode) {
  return mode === "dark" ? "#0e0d10" : "#f4f4f5"
}

function collectPolygonRings(geometry: Polygon | MultiPolygon): Position[][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates
  }
  return geometry.coordinates.flat()
}

function buildMaskFeature(
  country: FeatureCollection<Polygon | MultiPolygon>
): FeatureCollection<Polygon> {
  const worldRing: Position[] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ]

  const holes: Position[][] = country.features.flatMap((feature) =>
    collectPolygonRings(feature.geometry)
  )

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

async function loadSriLankaMask(): Promise<FeatureCollection<Polygon>> {
  const res = await fetch("/geo/sri-lanka.geojson")
  if (!res.ok) {
    throw new Error(`Failed to load Sri Lanka boundary (${res.status})`)
  }
  const country = (await res.json()) as FeatureCollection<Polygon | MultiPolygon>
  return buildMaskFeature(country)
}

function applyMask(
  map: maplibregl.Map,
  mask: FeatureCollection<Polygon>,
  mode: BasemapMode
) {
  const color = maskColor(mode)
  const existing = map.getSource(MASK_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined

  if (existing) {
    existing.setData(mask)
  } else {
    map.addSource(MASK_SOURCE_ID, {
      type: "geojson",
      data: mask,
    })
  }

  if (!map.getLayer(MASK_LAYER_ID)) {
    map.addLayer({
      id: MASK_LAYER_ID,
      type: "fill",
      source: MASK_SOURCE_ID,
      paint: {
        "fill-color": color,
        "fill-opacity": 1,
      },
    })
  } else {
    map.setPaintProperty(MASK_LAYER_ID, "fill-color", color)
  }
}

export function MapCanvas() {
  const { theme } = useTheme()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<maplibregl.Map | null>(null)
  const maskRef = React.useRef<FeatureCollection<Polygon> | null>(null)

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const mode = resolveMode(theme)
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(mode),
      center: SRI_LANKA_CENTER,
      zoom: 7.6,
      minZoom: 7,
      maxZoom: 18,
      maxBounds: SRI_LANKA_MAX_BOUNDS,
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

    map.fitBounds(SRI_LANKA_BOUNDS, { padding: 24, duration: 0 })

    const onStyleLoad = () => {
      if (maskRef.current) {
        applyMask(map, maskRef.current, resolveMode(theme))
      }
    }

    map.on("style.load", onStyleLoad)

    let cancelled = false
    loadSriLankaMask()
      .then((mask) => {
        if (cancelled) return
        maskRef.current = mask
        if (map.isStyleLoaded()) {
          applyMask(map, mask, resolveMode(theme))
        }
      })
      .catch((err: unknown) => {
        console.warn("Failed to load Sri Lanka mask", err)
      })

    mapRef.current = map

    return () => {
      cancelled = true
      map.off("style.load", onStyleLoad)
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setStyle(buildStyle(resolveMode(theme)))
  }, [theme])

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="size-full" />
    </div>
  )
}
