import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@/components/ui/tooltip.tsx"

// NOTE: StrictMode intentionally omitted — MapLibre's imperative lifecycle
// does not play well with the double mount/unmount dev check (triggers
// style reload races and WebGL context churn).
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </ThemeProvider>
)
