import { lazy, Suspense, useState } from "react"

import { AppHeader } from "@/components/app-header"
import { AuthPage } from "@/components/auth/auth-page"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { EntrySheet } from "@/components/entries/entry-sheet"
import { EntriesTable } from "@/components/entries/entries-table"
import { ImportCsvSheet } from "@/components/entries/import-csv-sheet"
import { CHUNK_RELOAD_FLAG, ErrorBoundary } from "@/components/error-boundary"
import { OverviewDashboard } from "@/components/overview/overview-dashboard"
import { ServiceList } from "@/components/service/service-list"
import { SettingsSheet } from "@/components/settings/settings-sheet"
import { OverallStats } from "@/components/stats/overall-stats"
import { StationStats } from "@/components/stats/station-stats"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/sonner"
import { AddVehicleOnboarding } from "@/components/vehicles/add-vehicle-onboarding"
import { VehicleChip } from "@/components/vehicles/vehicle-chip"
import { VehicleSwitcherSheet } from "@/components/vehicles/vehicle-switcher-sheet"
import { useAuth } from "@/hooks/auth-context"
import { EntriesProvider } from "@/hooks/use-entries"
import { useServiceRows } from "@/hooks/use-service-rows"
import { ServicesProvider } from "@/hooks/use-services"
import { AuthProvider } from "@/hooks/use-auth"
import { SyncProvider } from "@/hooks/use-sync"
import { VehiclesProvider } from "@/hooks/use-vehicles"
import { useVehicles } from "@/hooks/vehicles-context"

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tab, setTab] = useState("overview")
  const [statsView, setStatsView] = useState<"summary" | "trends">("summary")
  const { rows: serviceRows } = useServiceRows()
  const overdueCount = serviceRows.filter((r) => r.status.status === "overdue").length
  const badges = { service: overdueCount }

  return (
    <div className="min-h-svh">
      <AppHeader
        value={tab}
        onValueChange={setTab}
        onOpenImport={() => setImportOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onAddEntry={() => setAddOpen(true)}
        badges={badges}
      />
      <main className="mx-auto flex w-full min-w-0 max-w-[1080px] flex-col gap-4 px-4 pt-3 pb-32 md:px-8 md:pb-20">

      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsContent value="overview" className="flex flex-col gap-4">
          <OverviewDashboard
            onAddEntry={() => setAddOpen(true)}
            onImportCsv={() => setImportOpen(true)}
            onViewAllEntries={() => setTab("entries")}
            onOpenVehicle={() => setVehicleOpen(true)}
            onOpenService={() => setTab("service")}
          />
        </TabsContent>
        <TabsContent value="entries" className="flex flex-col gap-4">
          <VehicleChip onClick={() => setVehicleOpen(true)} />
          <EntriesTable />
        </TabsContent>
        <TabsContent value="service" className="flex flex-col gap-4">
          <VehicleChip onClick={() => setVehicleOpen(true)} />
          <ServiceList />
        </TabsContent>
        <TabsContent value="stats" className="flex flex-col gap-4">
          <VehicleChip onClick={() => setVehicleOpen(true)} />
          <div role="group" aria-label="Stats view" className="flex w-fit gap-0.5 rounded-full bg-card p-1 shadow-card">
            {(["summary", "trends"] as const).map((view) => (
              <button
                key={view}
                type="button"
                aria-pressed={statsView === view}
                onClick={() => setStatsView(view)}
                className={
                  "rounded-full px-4 py-1.5 text-sm font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring " +
                  (statsView === view ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {view}
              </button>
            ))}
          </div>
          {statsView === "summary" ? (
            <>
              <OverallStats />
              <StationStats />
            </>
          ) : (
            <ErrorBoundary>
              <Suspense
                fallback={<p className="py-10 text-center text-sm text-muted-foreground">Loading charts…</p>}
              >
                <TrendsCharts />
              </Suspense>
            </ErrorBoundary>
          )}
        </TabsContent>
      </Tabs>
      </main>

      <BottomTabBar value={tab} onValueChange={setTab} onAddEntry={() => setAddOpen(true)} badges={badges} />

      <EntrySheet open={addOpen} onOpenChange={setAddOpen} />
      <ImportCsvSheet open={importOpen} onOpenChange={setImportOpen} />
      <VehicleSwitcherSheet open={vehicleOpen} onOpenChange={setVehicleOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <Toaster />
    </div>
  )
}

function AppContent() {
  const { vehicles, isLoading } = useVehicles()

  if (isLoading) return null

  if (vehicles.length === 0) {
    return (
      <>
        <AddVehicleOnboarding />
        <Toaster />
      </>
    )
  }

  return (
    <EntriesProvider>
      <ServicesProvider>
        <AppShell />
      </ServicesProvider>
    </EntriesProvider>
  )
}

function AuthGate() {
  const { isAuthenticated, isLocalMode, isLoading, continueWithoutAccount } = useAuth()

  if (isLoading) return null

  // Signed in to a cloud account, or chose to use the app on this device only.
  if (!isAuthenticated && !isLocalMode) {
    return (
      <>
        <AuthPage onContinueLocal={continueWithoutAccount} />
        <Toaster />
      </>
    )
  }

  return (
    <SyncProvider>
      <VehiclesProvider>
        <AppContent />
      </VehiclesProvider>
    </SyncProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

export default App
