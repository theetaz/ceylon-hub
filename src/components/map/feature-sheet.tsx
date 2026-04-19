import * as React from "react"
import { Link } from "react-router-dom"
import {
  IconBuildingCommunity,
  IconBuildingHospital,
  IconExternalLink,
  IconInfoCircle,
  IconMap2,
  IconPlane,
  IconRoad,
  IconSchool,
  IconShieldCheck,
  IconTrain,
  IconUsers,
  IconWaveSine,
} from "@tabler/icons-react"
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { getDataset } from "@/data/catalog"
import { useLayerStore, type SelectedFeature } from "@/stores/layers"

type AgeBucket = { female: number; male: number; total: number }
type AgeBreakdown = Record<string, AgeBucket>

type GroupBreakdown = Record<string, number>

type AdminProperties = {
  id: string | number
  name: string
  level: number
  parentId?: string
  parentName?: string
  provinceId?: string
  provinceName?: string
  population?: number | null
  populationFemale?: number | null
  populationMale?: number | null
  populationAge?: AgeBreakdown | null
  populationYear?: number | null
  pcode?: string | null
  areaKm2?: number
  density?: number | null
  districtCount?: number
  dsDivisionCount?: number
  ethnicity?: GroupBreakdown | null
  religion?: GroupBreakdown | null
  censusYear?: number | null
}

type AdminFeature = Feature<Polygon | MultiPolygon, AdminProperties>
type AdminFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  AdminProperties
>

function compareName(a: AdminFeature, b: AdminFeature) {
  return a.properties.name.localeCompare(b.properties.name)
}

function useEnrichedDatasets() {
  const [provinces, setProvinces] = React.useState<AdminFeature[]>([])
  const [districts, setDistricts] = React.useState<AdminFeature[]>([])
  const [dsDivisions, setDsDivisions] = React.useState<AdminFeature[]>([])

  React.useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/geo/provinces.geojson").then((r) => r.json()),
      fetch("/geo/districts.geojson").then((r) => r.json()),
      fetch("/geo/ds-divisions.geojson").then((r) => r.json()),
    ])
      .then(
        ([p, d, ds]: [
          AdminFeatureCollection,
          AdminFeatureCollection,
          AdminFeatureCollection,
        ]) => {
          if (cancelled) return
          setProvinces(p.features)
          setDistricts(d.features)
          setDsDivisions(ds.features)
        }
      )
      .catch((err) => {
        console.warn("Failed to load enriched boundary metadata", err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { provinces, districts, dsDivisions }
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return "—"
  return value.toLocaleString("en-US")
}

function formatArea(km2: number | undefined) {
  if (km2 == null) return "—"
  return `${km2.toLocaleString("en-US", { maximumFractionDigits: 0 })} km²`
}

function formatDensity(density: number | null | undefined) {
  if (density == null) return "—"
  return `${density.toLocaleString("en-US", { maximumFractionDigits: 0 })} / km²`
}

function formatPercent(n: number, total: number) {
  if (!total) return "0%"
  return `${((n / total) * 100).toFixed(1)}%`
}

const AGE_GROUPS = {
  children: ["00_04", "05_09", "10_14"] as const,
  working: [
    "15_19",
    "20_24",
    "25_29",
    "30_34",
    "35_39",
    "40_44",
    "45_49",
    "50_54",
    "55_59",
    "60_64",
  ] as const,
  elderly: ["65_69", "70_74", "75_79", "80Plus"] as const,
}

function summarizeAges(age: AgeBreakdown | null | undefined) {
  if (!age) return null
  const sum = (keys: readonly string[]) =>
    keys.reduce((acc, k) => acc + (age[k]?.total ?? 0), 0)
  const children = sum(AGE_GROUPS.children)
  const working = sum(AGE_GROUPS.working)
  const elderly = sum(AGE_GROUPS.elderly)
  const total = children + working + elderly
  return { children, working, elderly, total }
}

const ETHNICITY_LABELS: Record<string, string> = {
  sinhala: "Sinhala",
  sriLankanTamil: "Sri Lankan Tamil",
  indianTamil: "Indian Tamil",
  moor: "Moor",
  burgher: "Burgher",
  malay: "Malay",
  other: "Other",
}

const RELIGION_LABELS: Record<string, string> = {
  buddhist: "Buddhist",
  hindu: "Hindu",
  muslim: "Muslim",
  romanCatholic: "Roman Catholic",
  otherChristian: "Other Christian",
  other: "Other",
}

const ETHNICITY_COLORS: Record<string, string> = {
  sinhala: "#f59e0b",
  sriLankanTamil: "#8b5cf6",
  indianTamil: "#6366f1",
  moor: "#10b981",
  burgher: "#ec4899",
  malay: "#06b6d4",
  other: "#64748b",
}

const RELIGION_COLORS: Record<string, string> = {
  buddhist: "#f59e0b",
  hindu: "#8b5cf6",
  muslim: "#10b981",
  romanCatholic: "#3b82f6",
  otherChristian: "#06b6d4",
  other: "#64748b",
}

function GroupBar({
  title,
  year,
  breakdown,
  labels,
  colors,
}: {
  title: string
  year?: number | null
  breakdown: GroupBreakdown
  labels: Record<string, string>
  colors: Record<string, string>
}) {
  const total = Object.entries(breakdown)
    .filter(([k]) => k !== "total")
    .reduce((sum, [, v]) => sum + (typeof v === "number" ? v : 0), 0)
  if (!total) return null
  const entries = Object.entries(breakdown)
    .filter(
      ([k, v]) => k !== "total" && typeof v === "number" && v > 0
    )
    .sort(([, a], [, b]) => (b as number) - (a as number))

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </div>
        {year && (
          <div className="text-[10px] text-muted-foreground">
            {year} census
          </div>
        )}
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {entries.map(([k, v]) => (
          <div
            key={k}
            className="h-full"
            style={{
              width: `${((v as number) / total) * 100}%`,
              backgroundColor: colors[k] ?? "#64748b",
            }}
            title={`${labels[k] ?? k}: ${(v as number).toLocaleString()}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-1 text-xs">
        {entries.map(([k, v]) => {
          const pct = ((v as number) / total) * 100
          return (
            <li
              key={k}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: colors[k] ?? "#64748b" }}
                />
                <span className="truncate text-muted-foreground">
                  {labels[k] ?? k}
                </span>
              </span>
              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                {pct >= 0.5 ? `${pct.toFixed(1)}%` : "< 0.5%"}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function DemographicsBlock({ properties }: { properties: AdminProperties }) {
  const {
    population,
    populationFemale,
    populationMale,
    populationAge,
    populationYear,
  } = properties
  if (population == null) return null

  const ages = summarizeAges(populationAge)

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Demographics
        </div>
        {populationYear && (
          <div className="text-[10px] text-muted-foreground">
            {populationYear} projection
          </div>
        )}
      </div>

      {populationFemale != null && populationMale != null && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Female / Male</span>
            <span className="font-mono tabular-nums">
              {formatPercent(populationFemale, population)} /{" "}
              {formatPercent(populationMale, population)}
            </span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-rose-400 dark:bg-rose-500"
              style={{ width: `${(populationFemale / population) * 100}%` }}
            />
            <div
              className="bg-sky-400 dark:bg-sky-500"
              style={{ width: `${(populationMale / population) * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
            <span>♀ {populationFemale.toLocaleString("en-US")}</span>
            <span>♂ {populationMale.toLocaleString("en-US")}</span>
          </div>
        </div>
      )}

      {ages && ages.total > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Age groups</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-emerald-400 dark:bg-emerald-500"
              style={{ width: `${(ages.children / ages.total) * 100}%` }}
              title={`Children 0–14: ${ages.children.toLocaleString()}`}
            />
            <div
              className="bg-indigo-400 dark:bg-indigo-500"
              style={{ width: `${(ages.working / ages.total) * 100}%` }}
              title={`Working 15–64: ${ages.working.toLocaleString()}`}
            />
            <div
              className="bg-amber-400 dark:bg-amber-500"
              style={{ width: `${(ages.elderly / ages.total) * 100}%` }}
              title={`Elderly 65+: ${ages.elderly.toLocaleString()}`}
            />
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
            <span>
              0–14 ·{" "}
              <span className="font-mono tabular-nums">
                {formatPercent(ages.children, ages.total)}
              </span>
            </span>
            <span className="text-center">
              15–64 ·{" "}
              <span className="font-mono tabular-nums">
                {formatPercent(ages.working, ages.total)}
              </span>
            </span>
            <span className="text-right">
              65+ ·{" "}
              <span className="font-mono tabular-nums">
                {formatPercent(ages.elderly, ages.total)}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function StatRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  )
}

type RoadProperties = {
  ref?: string | null
  name?: string | null
  highway?: string | null
  classes?: string[]
  segmentCount?: number
  totalLengthKm?: number
  roadNames?: string[]
  osmId?: number
}

type OsmFeatureProperties = {
  id?: string
  osmId?: number
  osmType?: "node" | "way" | "relation"
  name?: string | null
  nameSi?: string | null
  nameTa?: string | null
  kind?: string | null
  operator?: string | null
  beds?: number | null
  healthcare?: string | null
  iata?: string | null
  icao?: string | null
  military?: boolean
  gauge?: string | null
  electrified?: string | null
  waterway?: string | null
  water?: string | null
  protectionType?: string | null
}

const OSM_DATASET_IDS = [
  "railways",
  "airports",
  "hospitals",
  "education",
  "waterways",
  "protected-areas",
  "cities",
] as const
type OsmDatasetId = (typeof OSM_DATASET_IDS)[number]

function isOsmDataset(id: string | undefined): id is OsmDatasetId {
  return !!id && (OSM_DATASET_IDS as readonly string[]).includes(id)
}

const OSM_ICONS: Record<OsmDatasetId, typeof IconMap2> = {
  railways: IconTrain,
  airports: IconPlane,
  hospitals: IconBuildingHospital,
  education: IconSchool,
  waterways: IconWaveSine,
  "protected-areas": IconShieldCheck,
  cities: IconMap2,
}

function levelIcon(level: number) {
  if (level === 1) return IconMap2
  if (level === 2) return IconBuildingCommunity
  return IconUsers
}

function highwayLabel(highway: string | null | undefined) {
  switch (highway) {
    case "motorway":
      return "Motorway (E-class)"
    case "trunk":
      return "Trunk road (A-class)"
    case "primary":
      return "Primary road"
    case "secondary":
      return "Secondary road"
    default:
      return highway ?? "Road"
  }
}

function OsmInfo({
  properties,
  datasetId,
}: {
  properties: OsmFeatureProperties
  datasetId: OsmDatasetId
}) {
  const osmType = properties.osmType ?? "way"
  const osmLink = properties.osmId
    ? `https://www.openstreetmap.org/${osmType}/${properties.osmId}`
    : null

  return (
    <>
      <dl className="grid grid-cols-1 gap-2">
        {properties.name && (
          <StatRow label="Name" value={properties.name} />
        )}
        {properties.nameSi && properties.nameSi !== properties.name && (
          <StatRow
            label="Name (Sinhala)"
            value={<span lang="si">{properties.nameSi}</span>}
          />
        )}
        {properties.nameTa && properties.nameTa !== properties.name && (
          <StatRow
            label="Name (Tamil)"
            value={<span lang="ta">{properties.nameTa}</span>}
          />
        )}
        {properties.kind && (
          <StatRow label="Type" value={properties.kind.replace(/_/g, " ")} />
        )}

        {datasetId === "airports" && (
          <>
            {properties.iata && (
              <StatRow label="IATA" value={properties.iata} />
            )}
            {properties.icao && (
              <StatRow label="ICAO" value={properties.icao} />
            )}
            {properties.military && <StatRow label="Access" value="Military" />}
          </>
        )}

        {datasetId === "hospitals" && (
          <>
            {properties.operator && (
              <StatRow label="Operator" value={properties.operator} />
            )}
            {properties.beds != null && (
              <StatRow
                label="Beds"
                value={formatNumber(properties.beds)}
              />
            )}
            {properties.healthcare && (
              <StatRow label="Healthcare" value={properties.healthcare} />
            )}
          </>
        )}

        {datasetId === "education" && properties.operator && (
          <StatRow label="Operator" value={properties.operator} />
        )}

        {datasetId === "railways" && (
          <>
            {properties.gauge && (
              <StatRow label="Gauge" value={`${properties.gauge} mm`} />
            )}
            {properties.electrified && (
              <StatRow label="Electrified" value={properties.electrified} />
            )}
          </>
        )}

        {datasetId === "waterways" && (
          <>
            {properties.waterway && (
              <StatRow label="Waterway" value={properties.waterway} />
            )}
            {properties.water && (
              <StatRow label="Water type" value={properties.water} />
            )}
          </>
        )}

        {datasetId === "protected-areas" && properties.protectionType && (
          <StatRow
            label="Protection class"
            value={properties.protectionType}
          />
        )}
      </dl>

      {osmLink && (
        <div className="text-xs">
          <a
            href={osmLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            View on OpenStreetMap
            <IconExternalLink className="size-3" />
          </a>
        </div>
      )}
    </>
  )
}

function RoadInfo({
  properties,
  osmId,
}: {
  properties: RoadProperties
  osmId: number | undefined
}) {
  const classes = properties.classes ?? []
  const names = properties.roadNames ?? []
  return (
    <>
      <dl className="grid grid-cols-1 gap-2">
        {properties.ref && (
          <StatRow label="Reference" value={properties.ref} />
        )}
        <StatRow
          label="Class"
          value={
            classes.length > 1
              ? classes.map(highwayLabel).join(" · ")
              : highwayLabel(properties.highway ?? classes[0])
          }
        />
        <StatRow
          label="Total length"
          value={
            properties.totalLengthKm != null
              ? `${properties.totalLengthKm.toLocaleString("en-US", { maximumFractionDigits: 1 })} km`
              : "—"
          }
        />
        <StatRow
          label="Segments"
          value={formatNumber(properties.segmentCount)}
        />
      </dl>

      {names.length > 0 && (
        <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Named segments
          </div>
          <div className="text-xs text-muted-foreground">
            Shares {names.length} distinct OSM name{names.length === 1 ? "" : "s"}:
          </div>
          <ul className="mt-1 space-y-0.5 text-sm">
            {names.slice(0, 12).map((n) => (
              <li key={n} className="truncate">
                {n}
              </li>
            ))}
            {names.length > 12 && (
              <li className="text-xs text-muted-foreground">
                +{names.length - 12} more…
              </li>
            )}
          </ul>
        </div>
      )}

      {osmId && (
        <div className="text-xs">
          <a
            href={`https://www.openstreetmap.org/way/${osmId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            View a segment on OpenStreetMap
            <IconExternalLink className="size-3" />
          </a>
        </div>
      )}
    </>
  )
}

function levelLabel(level: number) {
  if (level === 1) return "Province"
  if (level === 2) return "District"
  if (level === 3) return "DS Division"
  return `Level ${level}`
}

function ChildrenList({
  title,
  items,
  emptyMessage,
  onSelect,
  limit = 50,
}: {
  title: string
  items: AdminFeature[]
  emptyMessage: string
  onSelect: (feature: AdminFeature) => void
  limit?: number
}) {
  if (items.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">{emptyMessage}</div>
    )
  }
  const visible = items.slice(0, limit)
  const extra = items.length - visible.length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wide">
        <span>{title}</span>
        <span className="font-mono">{items.length}</span>
      </div>
      <ul className="space-y-1">
        {visible.map((f) => {
          const pop = f.properties.population
          return (
            <li key={String(f.properties.id)}>
              <button
                type="button"
                onClick={() => onSelect(f)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="truncate">{f.properties.name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {pop != null ? formatNumber(pop) : ""}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {extra > 0 && (
        <div className="text-xs text-muted-foreground">
          +{extra} more…
        </div>
      )}
    </div>
  )
}

function featureToSelected(
  datasetId: string,
  feature: AdminFeature
): SelectedFeature {
  const { id, name, level, ...rest } = feature.properties
  return {
    datasetId,
    id,
    name,
    level,
    properties: { id, name, level, ...rest } as Record<string, unknown>,
  }
}

export function FeatureSheet() {
  const selected = useLayerStore((s) => s.selected)
  const setSelected = useLayerStore((s) => s.setSelected)
  const { provinces, districts, dsDivisions } = useEnrichedDatasets()

  const dataset = selected ? getDataset(selected.datasetId) : undefined
  const isRoad = selected?.datasetId === "roads"
  const isOsm = isOsmDataset(selected?.datasetId)
  const props = (selected?.properties ?? {}) as AdminProperties
  const roadProps = (selected?.properties ?? {}) as RoadProperties
  const osmProps = (selected?.properties ?? {}) as OsmFeatureProperties

  const Icon = selected
    ? isRoad
      ? IconRoad
      : isOsm
        ? OSM_ICONS[selected.datasetId as OsmDatasetId]
        : levelIcon(selected.level)
    : IconMap2

  const parentProvince = React.useMemo(() => {
    if (!selected) return undefined
    if (selected.level === 2 && props.parentId) {
      return provinces.find((p) => p.properties.id === props.parentId)
    }
    if (selected.level === 3 && props.provinceId) {
      return provinces.find((p) => p.properties.id === props.provinceId)
    }
    return undefined
  }, [selected, props, provinces])

  const parentDistrict = React.useMemo(() => {
    if (!selected || selected.level !== 3) return undefined
    return districts.find((d) => d.properties.id === props.parentId)
  }, [selected, props, districts])

  const childDistricts = React.useMemo(() => {
    if (!selected || selected.level !== 1) return []
    return districts
      .filter((d) => d.properties.parentId === selected.id)
      .sort(compareName)
  }, [selected, districts])

  const childDsDivisions = React.useMemo(() => {
    if (!selected) return []
    if (selected.level === 1) {
      return dsDivisions
        .filter((d) => d.properties.provinceId === selected.id)
        .sort(compareName)
    }
    if (selected.level === 2) {
      return dsDivisions
        .filter((d) => d.properties.parentId === selected.id)
        .sort(compareName)
    }
    return []
  }, [selected, dsDivisions])

  const selectChild = React.useCallback(
    (datasetId: string, feature: AdminFeature) => {
      setSelected(featureToSelected(datasetId, feature))
    },
    [setSelected]
  )

  return (
    <Sheet
      open={!!selected}
      onOpenChange={(open) => {
        if (!open) setSelected(null)
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-md"
      >
        {selected && (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate">{selected.name}</SheetTitle>
                  <SheetDescription className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {isRoad
                        ? highwayLabel(roadProps.highway)
                        : isOsm
                          ? (osmProps.kind ?? dataset?.shortTitle ?? "OSM")
                          : levelLabel(selected.level)}
                    </Badge>
                    {dataset && (
                      <Link
                        to={`/dataset/${dataset.id}`}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <IconInfoCircle className="size-3" />
                        {dataset.title}
                      </Link>
                    )}
                  </SheetDescription>
                </div>
              </div>

              {!isRoad && (parentProvince || parentDistrict) && (
                <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  <span>in</span>
                  {parentDistrict && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-1 py-0 text-xs"
                      onClick={() =>
                        selectChild("districts", parentDistrict)
                      }
                    >
                      {parentDistrict.properties.name}
                    </Button>
                  )}
                  {parentDistrict && parentProvince && (
                    <span className="text-muted-foreground/60">·</span>
                  )}
                  {parentProvince && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-1 py-0 text-xs"
                      onClick={() =>
                        selectChild("provinces", parentProvince)
                      }
                    >
                      {parentProvince.properties.name}
                    </Button>
                  )}
                </div>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {isRoad ? (
                  <RoadInfo
                    properties={roadProps}
                    osmId={roadProps.osmId}
                  />
                ) : isOsm ? (
                  <OsmInfo
                    properties={osmProps}
                    datasetId={selected.datasetId as OsmDatasetId}
                  />
                ) : (
                  <>
                <dl className="grid grid-cols-1 gap-2">
                  {selected.level === 1 && (
                    <>
                      <StatRow
                        label="Districts"
                        value={formatNumber(props.districtCount)}
                      />
                      <StatRow
                        label="DS divisions"
                        value={formatNumber(props.dsDivisionCount)}
                      />
                    </>
                  )}
                  {selected.level === 2 && (
                    <StatRow
                      label="DS divisions"
                      value={formatNumber(props.dsDivisionCount)}
                    />
                  )}
                  <StatRow
                    label={
                      props.populationYear
                        ? `Population (${props.populationYear})`
                        : "Population"
                    }
                    value={formatNumber(props.population)}
                  />
                  <StatRow label="Area" value={formatArea(props.areaKm2)} />
                  <StatRow
                    label="Density"
                    value={formatDensity(props.density)}
                  />
                </dl>

                <DemographicsBlock properties={props} />

                {props.ethnicity && (
                  <GroupBar
                    title="Ethnicity"
                    year={props.censusYear}
                    breakdown={props.ethnicity}
                    labels={ETHNICITY_LABELS}
                    colors={ETHNICITY_COLORS}
                  />
                )}

                {props.religion && (
                  <GroupBar
                    title="Religion"
                    year={props.censusYear}
                    breakdown={props.religion}
                    labels={RELIGION_LABELS}
                    colors={RELIGION_COLORS}
                  />
                )}

                {selected.level === 1 && (
                  <>
                    <Separator />
                    <ChildrenList
                      title="Districts"
                      items={childDistricts}
                      emptyMessage="No districts matched."
                      onSelect={(f) => selectChild("districts", f)}
                    />
                  </>
                )}

                {(selected.level === 1 || selected.level === 2) &&
                  childDsDivisions.length > 0 && (
                    <>
                      <Separator />
                      <ChildrenList
                        title="DS divisions"
                        items={childDsDivisions}
                        emptyMessage="No DS divisions matched."
                        onSelect={(f) => selectChild("ds-divisions", f)}
                        limit={selected.level === 1 ? 10 : 50}
                      />
                    </>
                  )}
                  </>
                )}

                <Separator />

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>ID</span>
                    <span className="font-mono">{String(selected.id)}</span>
                  </div>
                  {dataset && (
                    <div className="flex items-center justify-between">
                      <span>Source</span>
                      <a
                        href={dataset.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        {dataset.source.name}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>License</span>
                    <span>{dataset?.license ?? "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
