import { IconBrandGithub } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

const GITHUB_URL = "https://github.com/theetaz/ceylon-hub"

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-4" />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h1 className="truncate text-sm font-semibold tracking-tight">
          Ceylon Hub
        </h1>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Open geospatial &amp; demographic data for Sri Lanka
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="icon" aria-label="GitHub">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <IconBrandGithub className="size-4" />
          </a>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
