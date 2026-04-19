import { IconLayersIntersect } from "@tabler/icons-react"

import { ADMIN_LAYER_THEMES } from "@/components/map/admin-layers"
import { useTheme } from "@/components/theme-provider"
import { CATALOG } from "@/data/catalog"
import { useLayerStore } from "@/stores/layers"

function resolveMode(theme: string): "light" | "dark" {
  if (theme === "dark") return "dark"
  if (theme === "light") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function MapLegend() {
  const { theme } = useTheme()
  const visible = useLayerStore((s) => s.visible)
  const toggle = useLayerStore((s) => s.toggle)

  const mode = resolveMode(theme)
  const activeLayers = CATALOG.filter(
    (d) => d.status === "ready" && Boolean(visible[d.id])
  )

  if (activeLayers.length === 0) return null

  return (
    <div className="pointer-events-none absolute right-4 bottom-8 z-10 flex justify-end">
      <div className="pointer-events-auto flex w-64 max-w-[80vw] flex-col gap-2 rounded-lg border bg-background/90 p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          <IconLayersIntersect className="size-3.5" />
          Active layers
        </div>
        <ul className="flex flex-col gap-1.5">
          {activeLayers.map((dataset) => {
            const themeForLayer = ADMIN_LAYER_THEMES[dataset.id]?.[mode]
            const swatch = themeForLayer?.lineColor ?? "var(--primary)"
            return (
              <li
                key={dataset.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <button
                  type="button"
                  onClick={() => toggle(dataset.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-accent"
                >
                  <span
                    aria-hidden
                    className="inline-block size-3 shrink-0 rounded-sm border"
                    style={{ backgroundColor: swatch }}
                  />
                  <span className="truncate">{dataset.shortTitle}</span>
                </button>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {dataset.featureCount?.toLocaleString() ?? "—"}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
