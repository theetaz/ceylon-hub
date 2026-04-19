import { IconMap2 } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { CATALOG, CATEGORIES } from "@/data/catalog"
import { useLayerStore } from "@/stores/layers"
import { cn } from "@/lib/utils"

export function AppSidebar() {
  const visible = useLayerStore((s) => s.visible)
  const toggle = useLayerStore((s) => s.toggle)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <IconMap2 className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">Ceylon Hub</span>
            <span className="truncate text-xs text-muted-foreground">
              Sri Lanka geo &amp; data
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {CATEGORIES.map((category) => {
          const datasets = CATALOG.filter((d) => d.category === category.id)
          if (datasets.length === 0) return null
          return (
            <SidebarGroup key={category.id}>
              <SidebarGroupLabel className="flex items-center gap-1.5">
                <category.icon className="size-3.5" />
                {category.label}
              </SidebarGroupLabel>
              <SidebarGroupContent className="group-data-[collapsible=icon]:hidden">
                <SidebarMenu>
                  {datasets.map((dataset) => {
                    const isReady = dataset.status === "ready"
                    const isVisible = Boolean(visible[dataset.id])
                    const handleToggle = () => isReady && toggle(dataset.id)
                    return (
                      <SidebarMenuItem key={dataset.id}>
                        <div
                          role={isReady ? "button" : undefined}
                          tabIndex={isReady ? 0 : -1}
                          aria-pressed={isReady ? isVisible : undefined}
                          onClick={handleToggle}
                          onKeyDown={(event) => {
                            if (!isReady) return
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              handleToggle()
                            }
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors",
                            isReady &&
                              "cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                            !isReady && "opacity-60",
                            isReady &&
                              isVisible &&
                              "bg-sidebar-accent/60 text-sidebar-accent-foreground"
                          )}
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="truncate">{dataset.shortTitle}</span>
                            {!isReady && (
                              <Badge
                                variant="outline"
                                className="h-4 shrink-0 px-1 text-[9px] font-normal uppercase tracking-wide"
                              >
                                Soon
                              </Badge>
                            )}
                          </span>
                          {isReady && (
                            <Switch
                              checked={isVisible}
                              onCheckedChange={() => toggle(dataset.id)}
                              onClick={(event) => event.stopPropagation()}
                              className="ml-auto scale-75"
                              aria-label={`Toggle ${dataset.title}`}
                            />
                          )}
                        </div>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-1 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          Open source · MIT · Data: geoBoundaries, OSM
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
