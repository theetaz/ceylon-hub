import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  IconArrowLeft,
  IconChecks,
  IconDatabase,
  IconExternalLink,
  IconLicense,
  IconMapPin,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  CATALOG,
  CATEGORIES,
  type CategoryMeta,
  type Dataset,
} from "@/data/catalog"
import { cn } from "@/lib/utils"

type GeoFeature = {
  type: "Feature"
  properties?: Record<string, unknown> | null
  geometry?: { type: string }
}

type GeoFC = {
  type: "FeatureCollection"
  metadata?: Record<string, unknown>
  features: GeoFeature[]
}

function useDatasetPreview(path: string | undefined) {
  const [state, setState] = React.useState<{
    status: "idle" | "loading" | "ok" | "error"
    fc: GeoFC | null
    error: string | null
    sizeKb: number | null
  }>({ status: "idle", fc: null, error: null, sizeKb: null })

  React.useEffect(() => {
    if (!path) {
      setState({ status: "idle", fc: null, error: null, sizeKb: null })
      return
    }
    setState({ status: "loading", fc: null, error: null, sizeKb: null })
    let cancelled = false
    fetch(path)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        if (cancelled) return
        const json = JSON.parse(text) as GeoFC
        setState({
          status: "ok",
          fc: json,
          error: null,
          sizeKb: text.length / 1024,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setState({
          status: "error",
          fc: null,
          error: err.message ?? "Failed",
          sizeKb: null,
        })
      })
    return () => {
      cancelled = true
    }
  }, [path])

  return state
}

function keyCount<T>(items: T[], accessor: (item: T) => string | null | undefined) {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const key = accessor(item)
    if (!key) continue
    counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.entries(counts).sort(([, a], [, b]) => b - a)
}

function geometrySummary(features: GeoFeature[]) {
  return keyCount(features, (f) => f.geometry?.type ?? null)
}

function sampleNames(features: GeoFeature[], limit = 12) {
  const named = features
    .map((f) => (f.properties?.name as string) ?? null)
    .filter((n): n is string => typeof n === "string" && n.length > 0)
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of named) {
    if (seen.has(name)) continue
    seen.add(name)
    out.push(name)
    if (out.length >= limit) break
  }
  return { visible: out, total: seen.size }
}

function metadataEntries(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return []
  return Object.entries(metadata).filter(
    ([, v]) => typeof v === "string" || typeof v === "number"
  ) as Array<[string, string | number]>
}

function DatasetHeader({
  dataset,
  category,
}: {
  dataset: Dataset
  category: CategoryMeta | undefined
}) {
  return (
    <header className="flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1.5 text-sm"
      >
        <Link to="/">
          <IconArrowLeft className="size-4" />
          Map
        </Link>
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {category && (
            <span className="inline-flex items-center gap-1">
              <category.icon className="size-3.5" />
              {category.label}
            </span>
          )}
          <span>·</span>
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {dataset.status}
          </Badge>
          {dataset.kind && dataset.kind !== "layer" && (
            <Badge variant="outline" className="h-4 px-1 text-[10px]">
              {dataset.kind}
            </Badge>
          )}
        </div>
        <h1 className="truncate text-xl font-semibold">{dataset.title}</h1>
      </div>
      <ThemeToggle />
    </header>
  )
}

function InfoCard({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof IconDatabase
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function NotFound({ id }: { id: string | undefined }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Dataset not found</h1>
      <p className="text-sm text-muted-foreground">
        There is no dataset with id <code className="font-mono">{id}</code>.
      </p>
      <Button asChild>
        <Link to="/">Back to the map</Link>
      </Button>
    </div>
  )
}

export function DatasetPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dataset = React.useMemo(
    () => CATALOG.find((d) => d.id === id),
    [id]
  )
  const preview = useDatasetPreview(dataset?.path)

  React.useEffect(() => {
    if (!dataset) return
    document.title = `${dataset.title} · Ceylon Hub`
    return () => {
      document.title = "Ceylon Hub"
    }
  }, [dataset])

  if (!dataset) {
    return <NotFound id={id} />
  }

  const category = CATEGORIES.find((c) => c.id === dataset.category)
  const features = preview.fc?.features ?? []
  const geomSummary = geometrySummary(features)
  const names = sampleNames(features)
  const metadata = metadataEntries(preview.fc?.metadata)

  const otherDatasets = CATALOG.filter(
    (d) => d.id !== dataset.id && d.category === dataset.category
  )

  return (
    <div className="min-h-svh bg-background">
      <DatasetHeader dataset={dataset} category={category} />

      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <p className="mt-2 text-base text-muted-foreground">
          {dataset.description}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard icon={IconDatabase} label="Source">
            <a
              href={dataset.source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-2"
            >
              {dataset.source.name}
              <IconExternalLink className="size-3.5" />
            </a>
          </InfoCard>

          <InfoCard icon={IconLicense} label="License">
            {dataset.license}
          </InfoCard>

          <InfoCard icon={IconChecks} label="Counts">
            <div className="space-y-1">
              <div>
                Catalog count:{" "}
                <span className="font-mono tabular-nums">
                  {dataset.featureCount?.toLocaleString() ?? "—"}
                </span>
              </div>
              {preview.status === "ok" && (
                <div>
                  In file:{" "}
                  <span className="font-mono tabular-nums">
                    {features.length.toLocaleString()}
                  </span>
                </div>
              )}
              {preview.status === "ok" && preview.sizeKb != null && (
                <div>
                  File size:{" "}
                  <span className="font-mono tabular-nums">
                    {preview.sizeKb < 1024
                      ? `${preview.sizeKb.toFixed(1)} KB`
                      : `${(preview.sizeKb / 1024).toFixed(2)} MB`}
                  </span>
                </div>
              )}
            </div>
          </InfoCard>

          {geomSummary.length > 0 && (
            <InfoCard icon={IconMapPin} label="Geometries">
              <ul className="space-y-0.5">
                {geomSummary.map(([type, count]) => (
                  <li key={type} className="flex justify-between">
                    <span>{type}</span>
                    <span className="font-mono tabular-nums">
                      {count.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </InfoCard>
          )}

          {metadata.length > 0 && (
            <InfoCard icon={IconDatabase} label="File metadata">
              <dl className="space-y-0.5">
                {metadata.map(([k, v]) => (
                  <div key={k} className="flex flex-wrap justify-between gap-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-all text-right font-mono text-xs">
                      {String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </InfoCard>
          )}
        </div>

        {names.visible.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Sample features ({names.total} named)
            </h2>
            <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {names.visible.map((name) => (
                <li
                  key={name}
                  className="truncate rounded-md border bg-muted/20 px-3 py-1.5 text-sm"
                >
                  {name}
                </li>
              ))}
            </ul>
          </section>
        )}

        <Separator className="my-8" />

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              How this is fetched
            </div>
            <p className="text-sm text-muted-foreground">
              {dataset.path ? (
                <>
                  The file lives at{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    {dataset.path}
                  </code>{" "}
                  and is refreshed by the ETL in{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    scripts/data/
                  </code>
                  .
                </>
              ) : (
                <>
                  No static file: this dataset is either embedded in
                  another layer's properties or rendered dynamically.
                </>
              )}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              View on the map
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/?layer=${dataset.id}`)}
              className={cn(
                dataset.status !== "ready" && "pointer-events-none opacity-50"
              )}
              disabled={dataset.status !== "ready"}
            >
              Open in map
            </Button>
          </div>
        </section>

        {otherDatasets.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              More in {category?.label ?? "this category"}
            </h2>
            <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {otherDatasets.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/dataset/${d.id}`}
                    className="group block rounded-md border bg-card p-3 transition-colors hover:border-primary"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{d.title}</span>
                      <Badge
                        variant={d.status === "ready" ? "secondary" : "outline"}
                        className="h-4 px-1 text-[10px]"
                      >
                        {d.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {d.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-12 text-xs text-muted-foreground">
          <p>
            Part of{" "}
            <Link to="/" className="underline underline-offset-2">
              Ceylon Hub
            </Link>
            . Data and code are open source — MIT for the app, per-dataset
            license shown above.
          </p>
        </footer>
      </main>
    </div>
  )
}

export default DatasetPage
