import { lazy, Suspense, useState } from "react"
import { Fuel, Plus, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EntryDialog } from "@/components/entries/entry-dialog"
import { EntriesTable } from "@/components/entries/entries-table"
import { ImportCsvDialog } from "@/components/entries/import-csv-dialog"
import { OverallStats } from "@/components/stats/overall-stats"
import { StationStats } from "@/components/stats/station-stats"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/sonner"
import { EntriesProvider } from "@/hooks/use-entries"

// Recharts is the heaviest dependency and only the "Trends" tab needs it.
const TrendsCharts = lazy(() =>
  import("@/components/stats/trends-charts").then((m) => ({ default: m.TrendsCharts }))
)

function AppShell() {
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-4 p-4 pb-8">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Fuel className="size-5 text-primary" />
          <h1 className="font-heading text-lg font-semibold">Combust</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload /> Import
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus /> Add entry
          </Button>
        </div>
      </header>

      <Tabs defaultValue="entries">
        <TabsList className="w-full">
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
        <TabsContent value="entries" className="flex flex-col gap-4">
          <EntriesTable />
        </TabsContent>
        <TabsContent value="stats" className="flex flex-col gap-4">
          <OverallStats />
          <StationStats />
        </TabsContent>
        <TabsContent value="trends" className="flex flex-col gap-4">
          <Suspense
            fallback={<p className="py-10 text-center text-sm text-muted-foreground">Loading charts…</p>}
          >
            <TrendsCharts />
          </Suspense>
        </TabsContent>
      </Tabs>

      <EntryDialog open={addOpen} onOpenChange={setAddOpen} />
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
      <Toaster />
    </div>
  )
}

function App() {
  return (
    <EntriesProvider>
      <AppShell />
    </EntriesProvider>
  )
}

export default App
