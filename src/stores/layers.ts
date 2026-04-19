import { create } from "zustand"

import { readyDatasets } from "@/data/catalog"

export type SelectedFeature = {
  datasetId: string
  id: string | number
  name: string
  level: number
  properties: Record<string, unknown>
}

type LayerState = {
  visible: Record<string, boolean>
  selected: SelectedFeature | null
  toggle: (id: string) => void
  setVisible: (id: string, visible: boolean) => void
  setSelected: (feature: SelectedFeature | null) => void
}

const initialVisibility = () => {
  const visible: Record<string, boolean> = {}
  for (const dataset of readyDatasets()) {
    visible[dataset.id] = dataset.id === "districts"
  }
  return visible
}

export const useLayerStore = create<LayerState>((set) => ({
  visible: initialVisibility(),
  selected: null,
  toggle: (id) =>
    set((state) => ({
      visible: { ...state.visible, [id]: !state.visible[id] },
    })),
  setVisible: (id, visible) =>
    set((state) => ({
      visible: { ...state.visible, [id]: visible },
    })),
  setSelected: (feature) => set({ selected: feature }),
}))
