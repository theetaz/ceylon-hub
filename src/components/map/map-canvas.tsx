import * as React from "react"
import maplibregl from "maplibre-gl"
import { mask as turfMask } from "@turf/mask"
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson"
import type {
  MapGeoJSONFeature,
  MapMouseEvent,
  RasterTileSource,
  StyleSpecification,
} from "maplibre-gl"

import "maplibre-gl/dist/maplibre-gl.css"

import { useTheme } from "@/components/theme-provider"
import {
  ADMIN_DATASET_IDS,
  ADMIN_LAYER_THEMES,
  fillLayerSpec,
  layerIds,
  lineLayerSpec,
  type AdminDatasetId,
} from "@/components/map/admin-layers"
import { getDataset } from "@/data/catalog"
import { useLayerStore, type SelectedFeature } from "@/stores/layers"

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

function buildMask(
  country: FeatureCollection<Polygon | MultiPolygon>
): FeatureCollection<Polygon | MultiPolygon> {
  const masked = turfMask(country)
  return {
    type: "FeatureCollection",
    features: [masked as Feature<Polygon | MultiPolygon>],
  }
}

async function loadBoundary() {
  const res = await fetch("/geo/country.geojson")
  if (!res.ok) throw new Error(`Boundary load failed: ${res.status}`)
  const country = (await res.json()) as FeatureCollection<Polygon | MultiPolygon>
  return { mask: buildMask(country), outline: country }
}

async function loadAdminDataset(path: string) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Dataset load failed: ${res.status}`)
  return (await res.json()) as FeatureCollection<
    Polygon | MultiPolygon,
    { id: string; name: string; level: number }
  >
}

function addCountryOverlays(
  map: maplibregl.Map,
  data: {
    mask: FeatureCollection<Polygon | MultiPolygon>
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

function addAdminLayer(
  map: maplibregl.Map,
  id: AdminDatasetId,
  data: FeatureCollection,
  mode: BasemapMode
) {
  const ids = layerIds(id)
  const theme = ADMIN_LAYER_THEMES[id][mode]

  if (!map.getSource(ids.source)) {
    map.addSource(ids.source, {
      type: "geojson",
      data,
      promoteId: "id",
    })
  }
  if (!map.getLayer(ids.fill)) {
    map.addLayer(fillLayerSpec(id, theme))
  }
  if (!map.getLayer(ids.line)) {
    map.addLayer(lineLayerSpec(id, theme))
  }
}

function applyAdminTheme(map: maplibregl.Map, mode: BasemapMode) {
  for (const id of ADMIN_DATASET_IDS) {
    const ids = layerIds(id)
    const theme = ADMIN_LAYER_THEMES[id][mode]
    if (map.getLayer(ids.fill)) {
      map.setPaintProperty(ids.fill, "fill-color", theme.fillColor)
      map.setPaintProperty(ids.fill, "fill-opacity", [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        theme.fillHoverOpacity,
        theme.fillOpacity,
      ])
    }
    if (map.getLayer(ids.line)) {
      map.setPaintProperty(ids.line, "line-color", [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        theme.selectedLineColor,
        theme.lineColor,
      ])
      map.setPaintProperty(ids.line, "line-width", [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        theme.selectedLineWidth,
        ["boolean", ["feature-state", "hover"], false],
        theme.lineHoverWidth,
        theme.lineWidth,
      ])
    }
  }
}

function applyBasemapMode(map: maplibregl.Map, mode: BasemapMode) {
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

  applyAdminTheme(map, mode)
}

function setLayerVisible(
  map: maplibregl.Map,
  id: AdminDatasetId,
  visible: boolean
) {
  const ids = layerIds(id)
  const value = visible ? "visible" : "none"
  if (map.getLayer(ids.fill)) map.setLayoutProperty(ids.fill, "visibility", value)
  if (map.getLayer(ids.line)) map.setLayoutProperty(ids.line, "visibility", value)
}

function featureToSelected(
  datasetId: AdminDatasetId,
  feature: Feature | MapGeoJSONFeature
): SelectedFeature {
  const props = (feature.properties ?? {}) as Record<string, unknown>
  const id = (feature.id ?? props.id ?? "") as string | number
  return {
    datasetId,
    id,
    name: (props.name as string) ?? "Unnamed",
    level: (props.level as number) ?? 0,
    properties: props,
  }
}

function fitSriLanka(map: maplibregl.Map, duration = 0) {
  map.fitBounds(SRI_LANKA_BOUNDS, { padding: 48, duration })
}

export function MapCanvas() {
  const { theme } = useTheme()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<maplibregl.Map | null>(null)
  const hoverStateRef = React.useRef<
    Map<AdminDatasetId, string | number | null>
  >(new Map())

  const visible = useLayerStore((s) => s.visible)
  const selected = useLayerStore((s) => s.selected)
  const setSelected = useLayerStore((s) => s.setSelected)

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

    const resizeObserver = new ResizeObserver(() => {
      map.resize()
      fitSriLanka(map, 200)
    })
    resizeObserver.observe(containerRef.current)

    let cancelled = false
    const loadOverlays = async () => {
      if (cancelled) return

      try {
        const countryData = await loadBoundary()
        if (cancelled || !mapRef.current) return
        addCountryOverlays(map, countryData, resolveMode(theme))
      } catch (err) {
        console.warn("Failed to load country boundary", err)
      }

      const currentVisible = useLayerStore.getState().visible

      await Promise.all(
        ADMIN_DATASET_IDS.map(async (id) => {
          const dataset = getDataset(id)
          if (!dataset?.path) return
          try {
            const data = await loadAdminDataset(dataset.path)
            if (cancelled || !mapRef.current) return
            addAdminLayer(map, id, data, resolveMode(theme))
            setLayerVisible(map, id, Boolean(currentVisible[id]))
            wireAdminInteractivity(map, id)
          } catch (err) {
            console.warn(`Failed to load ${id}`, err)
          }
        })
      )
    }

    if (map.isStyleLoaded()) {
      void loadOverlays()
    } else {
      map.once("load", () => {
        void loadOverlays()
      })
    }

    const wireAdminInteractivity = (m: maplibregl.Map, id: AdminDatasetId) => {
      const ids = layerIds(id)
      const sourceId = ids.source

      const onMouseMove = (
        event: MapMouseEvent & { features?: MapGeoJSONFeature[] }
      ) => {
        const feature = event.features?.[0]
        if (!feature || feature.id == null) return
        m.getCanvas().style.cursor = "pointer"
        const prev = hoverStateRef.current.get(id)
        if (prev != null && prev !== feature.id) {
          m.setFeatureState({ source: sourceId, id: prev }, { hover: false })
        }
        hoverStateRef.current.set(id, feature.id)
        m.setFeatureState({ source: sourceId, id: feature.id }, { hover: true })
      }

      const onMouseLeave = () => {
        m.getCanvas().style.cursor = ""
        const prev = hoverStateRef.current.get(id)
        if (prev != null) {
          m.setFeatureState({ source: sourceId, id: prev }, { hover: false })
        }
        hoverStateRef.current.set(id, null)
      }

      const onClick = (
        event: MapMouseEvent & { features?: MapGeoJSONFeature[] }
      ) => {
        const feature = event.features?.[0]
        if (!feature) return
        setSelected(featureToSelected(id, feature))
      }

      m.on("mousemove", ids.fill, onMouseMove)
      m.on("mouseleave", ids.fill, onMouseLeave)
      m.on("click", ids.fill, onClick)
    }

    mapRef.current = map

    return () => {
      cancelled = true
      resizeObserver.disconnect()
      window.removeEventListener("resize", onResize)
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => applyBasemapMode(map, resolveMode(theme))
    if (map.loaded()) apply()
    else map.once("load", apply)
  }, [theme])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const id of ADMIN_DATASET_IDS) {
      const isVisible = Boolean(visible[id])
      if (map.getLayer(layerIds(id).fill)) {
        setLayerVisible(map, id, isVisible)
      }
    }
  }, [visible])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return

    for (const id of ADMIN_DATASET_IDS) {
      const sourceId = layerIds(id).source
      if (!map.getSource(sourceId)) continue
      if (selected?.datasetId === id && selected.id != null) {
        try {
          map.removeFeatureState({ source: sourceId })
        } catch {
          // ignore
        }
        map.setFeatureState({ source: sourceId, id: selected.id }, { selected: true })
      } else {
        try {
          map.removeFeatureState({ source: sourceId })
        } catch {
          // ignore
        }
      }
    }
  }, [selected])

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="size-full" />
    </div>
  )
}
