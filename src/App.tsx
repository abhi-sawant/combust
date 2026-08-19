import { lazy, Suspense, useState } from "react"

import { AppHeader } from "@/components/app-header"
import { AuthPage } from "@/components/auth/auth-page"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { EntrySheet } from "@/components/entries/entry-sheet"
import { EntriesTable } from "@/components/entries/entries-table"
import { ImportCsvSheet } from "@/components/entries/import-csv-sheet"
import { CHUNK_RELOAD_FLAG, ErrorBoundary } from "@/components/error-boundary"
import { OverviewDashboard } from "@/components/overview/overview-dashboard"
import { OverallStats } from "@/components/stats/overall-stats"
import { StationStats } from "@/components/stats/station-stats"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/sonner"
import { VehicleSwitcherSheet } from "@/components/vehicles/vehicle-switcher-sheet"
import { EntriesProvider } from "@/hooks/use-entries"
import { VehiclesProvider } from "@/hooks/use-vehicles"

// Recharts is the heaviest dependency and only the "Trends" tab needs it.
const TrendsCharts = lazy(() =>
  import("@/components/stats/trends-charts").then((m) => {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG)
    return { default: m.TrendsCharts }
  })
)

function AppShell() {
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [tab, setTab] = useState("overview")

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-4 p-4 pb-24 sm:pb-8">
      <AppHeader
        onOpenImport={() => setImportOpen(true)}
        onOpenVehicle={() => setVehicleOpen(true)}
        onAddEntry={() => setAddOpen(true)}
      />

      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList className="hidden w-full sm:flex">
          <TabsTrigger value="overview" className="flex-1">
            Overview
          </TabsTrigger>
          <TabsTrigger value="entries" className="flex-1">
            Entries
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-1">
            Stats
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex-1">
            Trends
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="flex flex-col gap-4">
          <OverviewDashboard
            onAddEntry={() => setAddOpen(true)}
            onImportCsv={() => setImportOpen(true)}
            onViewAllEntries={() => setTab("entries")}
          />
        </TabsContent>
        <TabsContent value="entries" className="flex flex-col gap-4">
          <EntriesTable />
        </TabsContent>
        <TabsContent value="stats" className="flex flex-col gap-4">
          <OverallStats />
          <StationStats />
        </TabsContent>
        <TabsContent value="trends" className="flex flex-col gap-4">
          <ErrorBoundary>
            <Suspense
              fallback={<p className="py-10 text-center text-sm text-muted-foreground">Loading charts…</p>}
            >
              <TrendsCharts />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>

      <BottomTabBar value={tab} onValueChange={setTab} onAddEntry={() => setAddOpen(true)} />

      <EntrySheet open={addOpen} onOpenChange={setAddOpen} />
      <ImportCsvSheet open={importOpen} onOpenChange={setImportOpen} />
      <VehicleSwitcherSheet open={vehicleOpen} onOpenChange={setVehicleOpen} />
      <Toaster />
    </div>
  )
}

function App() {
  const [authenticated, setAuthenticated] = useState(false)

  if (!authenticated) {
    return (
      <>
        <AuthPage onSignedIn={() => setAuthenticated(true)} />
        <Toaster />
      </>
    )
  }

  return (
    <VehiclesProvider>
      <EntriesProvider>
        <AppShell />
      </EntriesProvider>
    </VehiclesProvider>
  )
}

export default App
