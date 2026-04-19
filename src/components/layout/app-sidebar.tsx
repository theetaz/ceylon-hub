import {
  IconDatabase,
  IconInfoCircle,
  IconMap2,
  IconStack2,
} from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const NAV_ITEMS = [
  { title: "Map", icon: IconMap2, active: true },
  { title: "Layers", icon: IconStack2, active: false },
  { title: "Datasets", icon: IconDatabase, active: false },
  { title: "About", icon: IconInfoCircle, active: false },
] as const

export function AppSidebar() {
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
        <SidebarGroup>
          <SidebarGroupLabel>Explore</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={item.active}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 pb-1 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          Open source · MIT
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
