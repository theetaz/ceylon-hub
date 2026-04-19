import { create } from "zustand"

import { readyDatasets } from "@/data/catalog"

export type SelectedFeature = {
  datasetId: string
  id: string | number
  name: string
  level: number
  properties: Record<string, unknown>
}

export type ChoroplethMode = "none" | "density" | "population"

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

const CHOROPLETH_CYCLE: ChoroplethMode[] = ["none", "density", "population"]

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
    set((state) => ({
      choroplethMode: mode,
      // Ensure districts layer is visible whenever choropleth is active.
      visible:
        mode === "none"
          ? state.visible
          : { ...state.visible, districts: true },
    })),
  cycleChoroplethMode: () =>
    set((state) => {
      const idx = CHOROPLETH_CYCLE.indexOf(state.choroplethMode)
      const next = CHOROPLETH_CYCLE[(idx + 1) % CHOROPLETH_CYCLE.length]
      return {
        choroplethMode: next,
        visible:
          next === "none"
            ? state.visible
            : { ...state.visible, districts: true },
      }
    }),
  setExtrusion: (value) =>
    set((state) => ({
      extrusion: value,
      visible: value
        ? { ...state.visible, districts: true }
        : state.visible,
    })),
}))
