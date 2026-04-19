import { IconMap2 } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { getDataset } from "@/data/catalog"
import { useLayerStore } from "@/stores/layers"

export function FeatureSheet() {
  const selected = useLayerStore((s) => s.selected)
  const setSelected = useLayerStore((s) => s.setSelected)
  const dataset = selected ? getDataset(selected.datasetId) : undefined

  return (
    <Sheet
      open={!!selected}
      onOpenChange={(open) => {
        if (!open) setSelected(null)
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md">
        {selected && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <IconMap2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate">{selected.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 text-xs">
                    {dataset?.title ?? "Unknown layer"}
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      Level {selected.level}
                    </Badge>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="px-6 pb-6">
              <Separator className="my-4" />

              <dl className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">ID</dt>
                  <dd className="truncate font-mono text-xs">
                    {String(selected.id)}
                  </dd>
                </div>
                {typeof selected.properties.iso === "string" && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">ISO</dt>
                    <dd className="font-mono text-xs">
                      {selected.properties.iso}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Layer</dt>
                  <dd>{dataset?.shortTitle ?? selected.datasetId}</dd>
                </div>
              </dl>

              <Separator className="my-4" />

              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  More attributes (population, area, demographics) will appear
                  here as datasets come online.
                </p>
                {dataset && (
                  <p>
                    Source:{" "}
                    <a
                      href={dataset.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      {dataset.source.name}
                    </a>
                    {" · "}
                    {dataset.license}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
