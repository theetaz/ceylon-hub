import { create } from "zustand"

import { readyDatasets } from "@/data/catalog"
import { ELECTIONS } from "@/data/elections"

export type SelectedFeature = {
  datasetId: string
  id: string | number
  name: string
  level: number | string
  properties: Record<string, unknown>
}

// Choropleth mode can be the classic metric modes or any election id.
// Anything starting with "pres-" or "parl-" is treated as an election.
export type ChoroplethMode =
  | "none"
  | "density"
  | "population"
  | string // election ids — allowed strings

export function isElectionMode(mode: ChoroplethMode): boolean {
  return ELECTIONS.some((e) => e.id === mode)
}

type LayerState = {
  visible: Record<string, boolean>
  selected: SelectedFeature | null
  choroplethMode: ChoroplethMode
  extrusion: boolean
  toggle: (id: string) => void
  setVisible: (id: string, visible: boolean) => void
  setSelected: (feature: SelectedFeature | null) => void
  setChoroplethMode: (mode: ChoroplethMode) => void
  cycleChoroplethMode: () => void
  setExtrusion: (value: boolean) => void
}

const initialVisibility = () => {
  const visible: Record<string, boolean> = {}
  for (const dataset of readyDatasets()) {
    visible[dataset.id] = dataset.id === "districts"
  }
  return visible
}

const CHOROPLETH_CYCLE: ChoroplethMode[] = [
  "none",
  "density",
  "population",
  "pres-2024",
  "pres-2019",
  "pres-2015",
  "parl-2024",
]

export const useLayerStore = create<LayerState>((set) => ({
  visible: initialVisibility(),
  selected: null,
  choroplethMode: "none",
  extrusion: false,
  toggle: (id) =>
    set((state) => ({
      visible: { ...state.visible, [id]: !state.visible[id] },
    })),
  setVisible: (id, visible) =>
    set((state) => ({
      visible: { ...state.visible, [id]: visible },
    })),
  setSelected: (feature) => set({ selected: feature }),
  setChoroplethMode: (mode) =>
    set((state) => {
      if (mode === "none") return { choroplethMode: mode }
      if (isElectionMode(mode)) {
        // Election choropleths act on electoral divisions.
        return {
          choroplethMode: mode,
          visible: { ...state.visible, "electoral-divisions": true },
        }
      }
      // Density / population act on districts.
      return {
        choroplethMode: mode,
        visible: { ...state.visible, districts: true },
      }
    }),
  cycleChoroplethMode: () =>
    set((state) => {
      const idx = CHOROPLETH_CYCLE.indexOf(state.choroplethMode)
      const next = CHOROPLETH_CYCLE[(idx + 1) % CHOROPLETH_CYCLE.length]
      return { choroplethMode: next }
    }),
  setExtrusion: (value) =>
    set((state) => ({
      extrusion: value,
      visible: value
        ? { ...state.visible, districts: true }
        : state.visible,
    })),
}))
