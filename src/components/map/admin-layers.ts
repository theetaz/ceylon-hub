import type { FillLayerSpecification, LineLayerSpecification } from "maplibre-gl"

import type { Dataset } from "@/data/catalog"

export type AdminLayerTheme = {
  fillColor: string
  fillOpacity: number
  fillHoverOpacity: number
  lineColor: string
  lineWidth: number
  lineHoverWidth: number
  selectedLineColor: string
  selectedLineWidth: number
}

export type AdminLayerTheming = Record<"light" | "dark", AdminLayerTheme>

export const ADMIN_LAYER_THEMES: Record<string, AdminLayerTheming> = {
  provinces: {
    light: {
      fillColor: "#0f766e",
      fillOpacity: 0.08,
      fillHoverOpacity: 0.22,
      lineColor: "#0f766e",
      lineWidth: 1.5,
      lineHoverWidth: 2.5,
      selectedLineColor: "#134e4a",
      selectedLineWidth: 3,
    },
    dark: {
      fillColor: "#2dd4bf",
      fillOpacity: 0.08,
      fillHoverOpacity: 0.2,
      lineColor: "#2dd4bf",
      lineWidth: 1.4,
      lineHoverWidth: 2.4,
      selectedLineColor: "#a5f3fc",
      selectedLineWidth: 2.8,
    },
  },
  districts: {
    light: {
      fillColor: "#6366f1",
      fillOpacity: 0.05,
      fillHoverOpacity: 0.22,
      lineColor: "#4338ca",
      lineWidth: 0.8,
      lineHoverWidth: 1.8,
      selectedLineColor: "#1e1b4b",
      selectedLineWidth: 2.4,
    },
    dark: {
      fillColor: "#818cf8",
      fillOpacity: 0.04,
      fillHoverOpacity: 0.18,
      lineColor: "#c7d2fe",
      lineWidth: 0.7,
      lineHoverWidth: 1.6,
      selectedLineColor: "#fafafa",
      selectedLineWidth: 2.2,
    },
  },
  "ds-divisions": {
    light: {
      fillColor: "#f59e0b",
      fillOpacity: 0.03,
      fillHoverOpacity: 0.18,
      lineColor: "#b45309",
      lineWidth: 0.4,
      lineHoverWidth: 1.2,
      selectedLineColor: "#78350f",
      selectedLineWidth: 2,
    },
    dark: {
      fillColor: "#fbbf24",
      fillOpacity: 0.03,
      fillHoverOpacity: 0.16,
      lineColor: "#fcd34d",
      lineWidth: 0.35,
      lineHoverWidth: 1.1,
      selectedLineColor: "#fef3c7",
      selectedLineWidth: 2,
    },
  },
}

export const ADMIN_DATASET_IDS = ["provinces", "districts", "ds-divisions"] as const

export type AdminDatasetId = (typeof ADMIN_DATASET_IDS)[number]

export function isAdminDataset(id: string): id is AdminDatasetId {
  return (ADMIN_DATASET_IDS as readonly string[]).includes(id)
}

export type AdminLayerIds = {
  source: string
  fill: string
  line: string
}

export function layerIds(id: AdminDatasetId): AdminLayerIds {
  return {
    source: `admin-${id}`,
    fill: `admin-${id}-fill`,
    line: `admin-${id}-line`,
  }
}

export function fillLayerSpec(
  id: AdminDatasetId,
  theme: AdminLayerTheme
): FillLayerSpecification {
  const ids = layerIds(id)
  return {
    id: ids.fill,
    type: "fill",
    source: ids.source,
    layout: { visibility: "none" },
    paint: {
      "fill-color": theme.fillColor,
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        theme.fillHoverOpacity,
        theme.fillOpacity,
      ],
    },
  }
}

export function lineLayerSpec(
  id: AdminDatasetId,
  theme: AdminLayerTheme
): LineLayerSpecification {
  const ids = layerIds(id)
  return {
    id: ids.line,
    type: "line",
    source: ids.source,
    layout: {
      visibility: "none",
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        theme.selectedLineColor,
        theme.lineColor,
      ],
      "line-width": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        theme.selectedLineWidth,
        ["boolean", ["feature-state", "hover"], false],
        theme.lineHoverWidth,
        theme.lineWidth,
      ],
      "line-opacity": 0.85,
    },
  }
}

export function getAdminDatasetPath(dataset: Dataset): string | undefined {
  return dataset.path
}
