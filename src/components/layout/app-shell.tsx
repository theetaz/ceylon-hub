import * as React from "react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex min-h-svh flex-col">
        <Header />
        <main className="relative flex-1 overflow-hidden">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
