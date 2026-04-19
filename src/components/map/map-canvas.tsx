import * as React from "react"
import maplibregl from "maplibre-gl"
import { mask as turfMask } from "@turf/mask"
import { length as turfLength } from "@turf/length"
import type {
  Feature,
  FeatureCollection,
  LineString,
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
import { buildChoroplethFillColor } from "@/components/map/choropleth"
import {
  CITIES_CIRCLE_LAYER_ID,
  CITIES_LABEL_LAYER_ID,
  CITIES_SOURCE_ID,
  citiesCircleLayer,
  citiesLabelLayer,
  citiesTheme,
} from "@/components/map/cities-layer"
import {
  ROADS_CASING_LAYER_ID,
  ROADS_LINE_LAYER_ID,
  ROADS_SOURCE_ID,
  roadsCasingLayer,
  roadsLineColor,
  roadsLineLayer,
  roadsLineWidth,
  roadsTheme,
} from "@/components/map/roads-layer"
import {
  EXTRUSION_LAYER_ID,
  extrusionLayer,
} from "@/components/map/extrusion-layer"
import {
  OSM_DATASETS,
  type OsmLayerId,
} from "@/components/map/osm-layers"
import { getDataset } from "@/data/catalog"
import {
  useLayerStore,
  type ChoroplethMode,
  type SelectedFeature,
} from "@/stores/layers"

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
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
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

async function loadCitiesDataset(path: string) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Cities load failed: ${res.status}`)
  return await res.json()
}

function addCitiesLayer(
  map: maplibregl.Map,
  data: unknown,
  mode: BasemapMode
) {
  if (!map.getSource(CITIES_SOURCE_ID)) {
    map.addSource(CITIES_SOURCE_ID, {
      type: "geojson",
      data: data as GeoJSON.FeatureCollection,
      promoteId: "id",
    })
  }
  if (!map.getLayer(CITIES_CIRCLE_LAYER_ID)) {
    map.addLayer(citiesCircleLayer(mode))
  }
  if (!map.getLayer(CITIES_LABEL_LAYER_ID)) {
    map.addLayer(citiesLabelLayer(mode))
  }
}

function applyCitiesTheme(map: maplibregl.Map, mode: BasemapMode) {
  if (!map.getLayer(CITIES_CIRCLE_LAYER_ID)) return
  const theme = citiesTheme(mode)
  map.setPaintProperty(CITIES_CIRCLE_LAYER_ID, "circle-color", theme.circleColor)
  map.setPaintProperty(
    CITIES_CIRCLE_LAYER_ID,
    "circle-stroke-color",
    theme.circleStroke
  )
  map.setPaintProperty(CITIES_LABEL_LAYER_ID, "text-color", theme.labelColor)
  map.setPaintProperty(
    CITIES_LABEL_LAYER_ID,
    "text-halo-color",
    theme.labelHalo
  )
}

function setCitiesVisible(map: maplibregl.Map, visible: boolean) {
  const value = visible ? "visible" : "none"
  if (map.getLayer(CITIES_CIRCLE_LAYER_ID)) {
    map.setLayoutProperty(CITIES_CIRCLE_LAYER_ID, "visibility", value)
  }
  if (map.getLayer(CITIES_LABEL_LAYER_ID)) {
    map.setLayoutProperty(CITIES_LABEL_LAYER_ID, "visibility", value)
  }
}

type RoadProperties = {
  id: number
  highway: string
  name: string | null
  ref: string | null
}

type RoadFeatureCollection = FeatureCollection<LineString, RoadProperties>

async function loadRoadsDataset(path: string): Promise<RoadFeatureCollection> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Roads load failed: ${res.status}`)
  return (await res.json()) as RoadFeatureCollection
}

function addRoadsLayer(
  map: maplibregl.Map,
  data: unknown,
  mode: BasemapMode,
  beforeLayer?: string
) {
  if (!map.getSource(ROADS_SOURCE_ID)) {
    map.addSource(ROADS_SOURCE_ID, {
      type: "geojson",
      data: data as GeoJSON.FeatureCollection,
      promoteId: "id",
    })
  }
  if (!map.getLayer(ROADS_CASING_LAYER_ID)) {
    map.addLayer(roadsCasingLayer(mode), beforeLayer)
  }
  if (!map.getLayer(ROADS_LINE_LAYER_ID)) {
    map.addLayer(roadsLineLayer(mode), beforeLayer)
  }
}

function applyRoadsTheme(map: maplibregl.Map, mode: BasemapMode) {
  if (!map.getLayer(ROADS_LINE_LAYER_ID)) return
  const theme = roadsTheme(mode)
  map.setPaintProperty(ROADS_CASING_LAYER_ID, "line-color", theme.casing)
  // Re-apply the full expressions so the feature-state case for selected
  // road segments stays wired after a theme swap.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map.setPaintProperty(ROADS_LINE_LAYER_ID, "line-color", roadsLineColor(mode) as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map.setPaintProperty(ROADS_LINE_LAYER_ID, "line-width", roadsLineWidth() as any)
}

function setRoadsVisible(map: maplibregl.Map, visible: boolean) {
  const value = visible ? "visible" : "none"
  if (map.getLayer(ROADS_CASING_LAYER_ID)) {
    map.setLayoutProperty(ROADS_CASING_LAYER_ID, "visibility", value)
  }
  if (map.getLayer(ROADS_LINE_LAYER_ID)) {
    map.setLayoutProperty(ROADS_LINE_LAYER_ID, "visibility", value)
  }
}

async function loadOsmDataset(path: string) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`OSM load failed: ${res.status}`)
  return await res.json()
}

function addOsmDataset(
  map: maplibregl.Map,
  id: OsmLayerId,
  data: unknown,
  mode: BasemapMode,
  beforeLayer?: string
) {
  const config = OSM_DATASETS[id]
  if (!map.getSource(config.sourceId)) {
    map.addSource(config.sourceId, {
      type: "geojson",
      data: data as GeoJSON.FeatureCollection,
      promoteId: "osmId",
    })
  }
  for (const entry of config.layers) {
    const spec = entry.spec(mode)
    if (map.getLayer(spec.id)) continue
    const target = entry.beneathRoads && map.getLayer(ROADS_CASING_LAYER_ID)
      ? ROADS_CASING_LAYER_ID
      : beforeLayer
    map.addLayer(spec, target)
  }
}

function setOsmDatasetVisible(
  map: maplibregl.Map,
  id: OsmLayerId,
  visible: boolean
) {
  const config = OSM_DATASETS[id]
  const value = visible ? "visible" : "none"
  for (const entry of config.layers) {
    const spec = entry.spec("light") // spec id is mode-agnostic
    if (map.getLayer(spec.id)) {
      map.setLayoutProperty(spec.id, "visibility", value)
    }
  }
}

function applyOsmTheme(map: maplibregl.Map, mode: BasemapMode) {
  for (const config of Object.values(OSM_DATASETS)) {
    for (const entry of config.layers) {
      const themed = entry.spec(mode)
      if (!map.getLayer(themed.id)) continue
      const paint = themed.paint as Record<string, unknown> | undefined
      if (!paint) continue
      for (const [prop, value] of Object.entries(paint)) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.setPaintProperty(themed.id, prop, value as any)
        } catch {
          // ignore unsupported property combinations
        }
      }
    }
  }
}

function ensureExtrusionLayer(map: maplibregl.Map, mode: BasemapMode) {
  if (map.getLayer(EXTRUSION_LAYER_ID)) return
  if (!map.getSource(layerIds("districts").source)) return
  map.addLayer(extrusionLayer(mode))
}

function setExtrusionVisible(map: maplibregl.Map, visible: boolean) {
  if (!map.getLayer(EXTRUSION_LAYER_ID)) return
  map.setLayoutProperty(
    EXTRUSION_LAYER_ID,
    "visibility",
    visible ? "visible" : "none"
  )
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

function applyAdminTheme(
  map: maplibregl.Map,
  mode: BasemapMode,
  choropleth: ChoroplethMode = "none"
) {
  for (const id of ADMIN_DATASET_IDS) {
    const ids = layerIds(id)
    const theme = ADMIN_LAYER_THEMES[id][mode]
    if (map.getLayer(ids.fill)) {
      const fillColor =
        id === "districts" && choropleth !== "none"
          ? buildChoroplethFillColor(choropleth, theme.fillColor)
          : theme.fillColor
      const baseOpacity =
        id === "districts" && choropleth !== "none" ? 0.75 : theme.fillOpacity
      const hoverOpacity =
        id === "districts" && choropleth !== "none"
          ? 0.9
          : theme.fillHoverOpacity
      map.setPaintProperty(ids.fill, "fill-color", fillColor)
      map.setPaintProperty(ids.fill, "fill-opacity", [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        hoverOpacity,
        baseOpacity,
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

  applyAdminTheme(map, mode, useLayerStore.getState().choroplethMode)
  applyCitiesTheme(map, mode)
  applyRoadsTheme(map, mode)
  applyOsmTheme(map, mode)
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
  const roadsDataRef = React.useRef<RoadFeatureCollection | null>(null)
  const selectedRoadSegmentsRef = React.useRef<number[]>([])

  const visible = useLayerStore((s) => s.visible)
  const selected = useLayerStore((s) => s.selected)
  const setSelected = useLayerStore((s) => s.setSelected)
  const choroplethMode = useLayerStore((s) => s.choroplethMode)
  const extrusion = useLayerStore((s) => s.extrusion)

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

    let lastW = 0
    let lastH = 0
    let initialObserved = false
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width === lastW && height === lastH) return
      lastW = width
      lastH = height
      map.resize()
      if (initialObserved) {
        fitSriLanka(map, 200)
      } else {
        initialObserved = true
      }
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

      try {
        const citiesDataset = getDataset("cities")
        if (citiesDataset?.path) {
          const data = await loadCitiesDataset(citiesDataset.path)
          if (!cancelled && mapRef.current) {
            addCitiesLayer(map, data, resolveMode(theme))
            setCitiesVisible(map, Boolean(currentVisible.cities))
          }
        }
      } catch (err) {
        console.warn("Failed to load cities", err)
      }

      try {
        const roadsDataset = getDataset("roads")
        if (roadsDataset?.path) {
          const data = await loadRoadsDataset(roadsDataset.path)
          if (!cancelled && mapRef.current) {
            // Insert roads below the cities layer so labels stay on top.
            addRoadsLayer(
              map,
              data,
              resolveMode(theme),
              map.getLayer(CITIES_CIRCLE_LAYER_ID) ? CITIES_CIRCLE_LAYER_ID : undefined
            )
            setRoadsVisible(map, Boolean(currentVisible.roads))
            roadsDataRef.current = data
            wireRoadInteractivity(map)
          }
        }
      } catch (err) {
        console.warn("Failed to load roads", err)
      }

      // Load all OSM datasets (railways, airports, hospitals, schools,
      // waterways, protected areas). Each is independent — a failure in
      // one doesn't block the rest.
      await Promise.all(
        (Object.keys(OSM_DATASETS) as OsmLayerId[]).map(async (id) => {
          const config = OSM_DATASETS[id]
          try {
            const data = await loadOsmDataset(config.path)
            if (cancelled || !mapRef.current) return
            addOsmDataset(map, id, data, resolveMode(theme))
            setOsmDatasetVisible(map, id, Boolean(currentVisible[id]))
          } catch (err) {
            console.warn(`Failed to load ${id}`, err)
          }
        })
      )

      // Re-apply the current admin theme now that layers exist, so any
      // choropleth mode toggled before the data loaded takes effect.
      if (!cancelled && mapRef.current) {
        applyAdminTheme(
          map,
          resolveMode(theme),
          useLayerStore.getState().choroplethMode
        )
      }
    }

    if (map.isStyleLoaded()) {
      void loadOverlays()
    } else {
      map.once("load", () => {
        void loadOverlays()
      })
    }

    const wireRoadInteractivity = (m: maplibregl.Map) => {
      const onMove = () => {
        m.getCanvas().style.cursor = "pointer"
      }
      const onLeave = () => {
        m.getCanvas().style.cursor = ""
      }
      const onClick = (
        event: MapMouseEvent & { features?: MapGeoJSONFeature[] }
      ) => {
        const feature = event.features?.[0]
        if (!feature) return
        const props = feature.properties as RoadProperties | undefined
        if (!props) return
        handleRoadClick(props)
      }
      m.on("mousemove", ROADS_LINE_LAYER_ID, onMove)
      m.on("mouseleave", ROADS_LINE_LAYER_ID, onLeave)
      m.on("click", ROADS_LINE_LAYER_ID, onClick)
    }

    const handleRoadClick = (clicked: RoadProperties) => {
      const m = mapRef.current
      const data = roadsDataRef.current
      if (!m || !data) return

      // Group by ref (e.g. "A1"). Ways without a ref: fall back to name.
      // Only a single way is selected if neither ref nor name is present.
      const key: { field: "ref" | "name" | "id"; value: string | number } =
        clicked.ref
          ? { field: "ref", value: clicked.ref }
          : clicked.name
            ? { field: "name", value: clicked.name }
            : { field: "id", value: clicked.id }

      const matching = data.features.filter((f) => {
        if (key.field === "id") return f.properties.id === key.value
        return f.properties[key.field] === key.value
      })

      if (matching.length === 0) return

      const totalLengthKm = matching.reduce(
        (sum, f) => sum + turfLength(f, { units: "kilometers" }),
        0
      )

      const classes = Array.from(
        new Set(matching.map((f) => f.properties.highway))
      )
      const names = Array.from(
        new Set(matching.map((f) => f.properties.name).filter(Boolean) as string[])
      )

      // Clear previous selection feature-state
      for (const id of selectedRoadSegmentsRef.current) {
        m.setFeatureState(
          { source: ROADS_SOURCE_ID, id },
          { selected: false }
        )
      }
      selectedRoadSegmentsRef.current = matching.map(
        (f) => f.properties.id
      )
      for (const id of selectedRoadSegmentsRef.current) {
        m.setFeatureState(
          { source: ROADS_SOURCE_ID, id },
          { selected: true }
        )
      }

      setSelected({
        datasetId: "roads",
        id: String(key.value),
        name: (clicked.ref as string) ?? (clicked.name as string) ?? `Road ${clicked.id}`,
        level: 0,
        properties: {
          ref: clicked.ref,
          name: clicked.name,
          highway: clicked.highway,
          classes,
          segmentCount: matching.length,
          totalLengthKm: Number(totalLengthKm.toFixed(1)),
          roadNames: names,
          osmId: clicked.id,
        },
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
    const apply = () =>
      applyAdminTheme(map, resolveMode(theme), choroplethMode)
    // applyAdminTheme only touches layers that exist — safe to call
    // repeatedly as sources come online.
    if (map.isStyleLoaded()) apply()
    else map.once("load", apply)
  }, [choroplethMode, theme])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const id of ADMIN_DATASET_IDS) {
      const isVisible = Boolean(visible[id])
      if (map.getLayer(layerIds(id).fill)) {
        setLayerVisible(map, id, isVisible)
      }
    }
    if (map.getLayer(CITIES_CIRCLE_LAYER_ID)) {
      setCitiesVisible(map, Boolean(visible.cities))
    }
    if (map.getLayer(ROADS_LINE_LAYER_ID)) {
      setRoadsVisible(map, Boolean(visible.roads))
    }
    for (const id of Object.keys(OSM_DATASETS) as OsmLayerId[]) {
      const config = OSM_DATASETS[id]
      // any member layer is enough to decide existence
      const firstLayerId = config.layers[0].spec("light").id
      if (map.getLayer(firstLayerId)) {
        setOsmDatasetVisible(map, id, Boolean(visible[id]))
      }
    }
  }, [visible])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      ensureExtrusionLayer(map, resolveMode(theme))
      setExtrusionVisible(map, extrusion)
      // Hide flat district fill while extruded so we see the columns clearly.
      const flatFill = layerIds("districts").fill
      if (map.getLayer(flatFill)) {
        map.setLayoutProperty(
          flatFill,
          "visibility",
          extrusion ? "none" : visible.districts ? "visible" : "none"
        )
      }
      // Tilt or flatten the camera
      map.easeTo({
        pitch: extrusion ? 50 : 0,
        bearing: extrusion ? -20 : 0,
        duration: 800,
      })
    }
    if (map.isStyleLoaded()) apply()
    else map.once("load", apply)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extrusion])

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

    // Clear any road segment selection when selection changes to a
    // non-road feature or closes entirely.
    if (selected?.datasetId !== "roads" && map.getSource(ROADS_SOURCE_ID)) {
      for (const segmentId of selectedRoadSegmentsRef.current) {
        map.setFeatureState(
          { source: ROADS_SOURCE_ID, id: segmentId },
          { selected: false }
        )
      }
      selectedRoadSegmentsRef.current = []
    }
  }, [selected])

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="size-full" />
    </div>
  )
}
