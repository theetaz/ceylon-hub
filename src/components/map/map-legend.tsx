import { IconInfoCircle, IconLayersIntersect } from "@tabler/icons-react"
import { Link } from "react-router-dom"

import { ADMIN_LAYER_THEMES } from "@/components/map/admin-layers"
import {
  getChoroplethLabel,
  getChoroplethStops,
} from "@/components/map/choropleth"
import { OSM_COLORS } from "@/components/map/osm-layers"
import { useTheme } from "@/components/theme-provider"
import { CATALOG } from "@/data/catalog"
import { getElection, OTHER_PARTY } from "@/data/elections"
import { isElectionMode, useLayerStore } from "@/stores/layers"

function resolveMode(theme: string): "light" | "dark" {
  if (theme === "dark") return "dark"
  if (theme === "light") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function ChoroplethScale() {
  const choroplethMode = useLayerStore((s) => s.choroplethMode)
  const setChoroplethMode = useLayerStore((s) => s.setChoroplethMode)
  if (choroplethMode === "none") return null

  const label = (
    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
      <span className="font-semibold tracking-wide uppercase">
        {getChoroplethLabel(choroplethMode)}
      </span>
      <button
        type="button"
        onClick={() => setChoroplethMode("none")}
        className="rounded px-1 text-[10px] hover:bg-accent"
      >
        clear
      </button>
    </div>
  )

  if (isElectionMode(choroplethMode)) {
    const election = getElection(choroplethMode)
    if (election) {
      const entries = Object.entries(election.parties)
      return (
        <div className="mt-1 space-y-1.5 border-t pt-2">
          {label}
          <ul className="space-y-0.5 text-xs">
            {entries.map(([code, meta]) => (
              <li
                key={code}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="truncate text-muted-foreground">
                    {meta.candidate}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/70">
                  {code}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: OTHER_PARTY.color }}
                />
                <span className="truncate text-muted-foreground">Other</span>
              </span>
            </li>
          </ul>
        </div>
      )
    }
  }

  const stops = getChoroplethStops(choroplethMode)
  if (!stops) return null
  return (
    <div className="mt-1 space-y-1 border-t pt-2">
      {label}
      <div
        className="h-2 rounded-full"
        style={{
          backgroundImage: `linear-gradient(to right, ${stops
            .map((s) => s.color)
            .join(", ")})`,
        }}
      />
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground tabular-nums">
        {stops.map((stop, i) =>
          i === 0 || i === stops.length - 1 || i === Math.floor(stops.length / 2) ? (
            <span key={stop.value}>{stop.label}</span>
          ) : (
            <span key={stop.value} className="opacity-0">
              {stop.label}
            </span>
          )
        )}
      </div>
    </div>
  )
}

export function MapLegend() {
  const { theme } = useTheme()
  const visible = useLayerStore((s) => s.visible)
  const toggle = useLayerStore((s) => s.toggle)
  const choroplethMode = useLayerStore((s) => s.choroplethMode)

  const mode = resolveMode(theme)
  const activeLayers = CATALOG.filter(
    (d) =>
      d.status === "ready" &&
      Boolean(visible[d.id]) &&
      d.kind !== "choropleth" &&
      d.kind !== "embedded" &&
      d.kind !== "extrusion"
  )

  const hasContent = activeLayers.length > 0 || choroplethMode !== "none"
  if (!hasContent) return null

  return (
    <div className="pointer-events-none absolute right-4 bottom-8 z-10 flex justify-end">
      <div className="pointer-events-auto flex w-64 max-w-[80vw] flex-col gap-2 rounded-lg border bg-background/90 p-3 shadow-lg backdrop-blur">
        {activeLayers.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <IconLayersIntersect className="size-3.5" />
              Active layers
            </div>
            <ul className="flex flex-col gap-1.5">
              {activeLayers.map((dataset) => {
                const adminColor =
                  ADMIN_LAYER_THEMES[dataset.id]?.[mode]?.lineColor
                const osmColor = OSM_COLORS[dataset.id as keyof typeof OSM_COLORS]?.[mode]
                const swatch = adminColor ?? osmColor ?? "var(--primary)"
                return (
                  <li
                    key={dataset.id}
                    className="flex items-center justify-between gap-1 text-sm"
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
                    <Link
                      to={`/dataset/${dataset.id}`}
                      aria-label={`About ${dataset.title}`}
                      className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:bg-accent hover:text-foreground"
                    >
                      <IconInfoCircle className="size-3.5" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        <ChoroplethScale />
      </div>
    </div>
  )
}
