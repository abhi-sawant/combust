import { useId, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Field, FieldLabel } from './ui/field';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { Input } from './ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useToast } from './ui/toast';
import { EfficiencySparkline } from './EfficiencySparkline';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Cancel01Icon,
  Delete01Icon,
  Delete02Icon,
  PencilEdit01Icon,
} from '@hugeicons/core-free-icons';
import { deriveLegs, parseEntryDate, type Entry, type Leg } from '../types';
import { cn } from '@/lib/utils';

type DeleteTarget = { type: 'single'; id: number; date: string } | { type: 'all'; count: number };
type RangeFilter = '6' | '12' | 'all';

type EntriesProps = {
  entries: Entry[];
  addEntry: (entry: Omit<Entry, 'id' | 'userId'>) => Promise<number>;
  updateEntry: (entry: Entry) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  clearAllEntries: () => Promise<void>;
};

function Entries({ entries, addEntry, updateEntry, deleteEntry, clearAllEntries }: EntriesProps) {
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editDate, setEditDate] = useState<Date>();
  const [editStation, setEditStation] = useState<string>('');
  const [editFormError, setEditFormError] = useState<string>('');

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const [stationFilter, setStationFilter] = useState<string>('All');
  const [range, setRange] = useState<RangeFilter>('all');

  // Single shared selector (src/types.ts) — sorted newest-first with
  // distance/efficiency computed from dates, not array position, so the
  // numbers here always agree with the Statistics tab.
  const legs = useMemo(() => deriveLegs(entries), [entries]);
  const latestEntry = legs[0] ?? null;

  const stations = useMemo(() => {
    return Array.from(new Set(entries.map((entry) => entry.fuelStation)));
  }, [entries]);

  const displayLegs = useMemo(() => {
    let result = legs;
    if (stationFilter !== 'All') result = result.filter((l) => l.fuelStation === stationFilter);
    if (range !== 'all') result = result.slice(0, Number(range));
    return result;
  }, [legs, stationFilter, range]);

  const withEfficiency = useMemo(
    () => displayLegs.filter((l): l is Leg & { efficiency: number } => l.efficiency !== null),
    [displayLegs]
  );
  const latestLeg = withEfficiency[0] ?? null;

  const trailingAvg = useMemo(() => {
    const trailing = withEfficiency.slice(1, 5);
    if (trailing.length === 0) return null;
    return trailing.reduce((sum, l) => sum + l.efficiency, 0) / trailing.length;
  }, [withEfficiency]);

  const deltaPct = latestLeg && trailingAvg ? ((latestLeg.efficiency - trailingAvg) / trailingAvg) * 100 : null;

  const sparklinePoints = useMemo(() => {
    return withEfficiency
      .slice()
      .reverse()
      .map((l) => ({ date: format(parseEntryDate(l.date), 'MMM yy'), value: l.efficiency }));
  }, [withEfficiency]);

  const stripStats = useMemo(() => {
    if (displayLegs.length === 0) return null;
    const totalSpent = displayLegs.reduce((sum, l) => sum + l.amountPaid, 0);
    const totalLitres = displayLegs.reduce((sum, l) => sum + l.fuelFilled, 0);
    const avgPpl = totalLitres > 0 ? totalSpent / totalLitres : 0;
    const totalDistance = withEfficiency.reduce((sum, l) => sum + (l.distanceTravelled as number), 0);
    const avgCostPerKm =
      withEfficiency.length > 0
        ? withEfficiency.reduce((sum, l) => sum + (l.costPerKm as number), 0) / withEfficiency.length
        : 0;
    return { totalSpent, avgPpl, totalDistance, avgCostPerKm, measuredCount: withEfficiency.length };
  }, [displayLegs, withEfficiency]);

  const bestEfficiency = withEfficiency.length > 0 ? Math.max(...withEfficiency.map((l) => l.efficiency)) : null;
  const worstEfficiency = withEfficiency.length > 0 ? Math.min(...withEfficiency.map((l) => l.efficiency)) : null;
  const showBestWorst = withEfficiency.length > 1;

  function barPercentFor(eff: number | null): number | null {
    if (eff === null || bestEfficiency === null || worstEfficiency === null) return null;
    if (bestEfficiency === worstEfficiency) return 100;
    return 14 + ((eff - worstEfficiency) / (bestEfficiency - worstEfficiency)) * 86;
  }

  // Odometer readings must increase monotonically with date. Catches the
  // common typo (a missing or transposed digit) before it poisons every
  // efficiency figure computed around it.
  function validateOdometer(dateStr: string, odometerReading: number, excludeId?: number): string | null {
    const target = parseEntryDate(dateStr).getTime();
    let before: Entry | null = null;
    let after: Entry | null = null;

    for (const e of entries) {
      if (e.id === excludeId) continue;
      const t = parseEntryDate(e.date).getTime();
      if (t <= target) {
        if (!before || parseEntryDate(before.date).getTime() < t) before = e;
      } else {
        if (!after || parseEntryDate(after.date).getTime() > t) after = e;
      }
    }

    if (before && odometerReading <= before.odometerReading) {
      return `Odometer must be greater than ${before.odometerReading.toLocaleString()} km — your reading on ${before.date}.`;
    }
    if (after && odometerReading >= after.odometerReading) {
      return `Odometer must be less than ${after.odometerReading.toLocaleString()} km — your reading on ${after.date}.`;
    }
    return null;
  }

  function handleEdit(entry: Entry) {
    setEditingEntry(entry);
    setEditDate(parseEntryDate(entry.date));
    setEditStation(entry.fuelStation);
    setEditFormError('');
    setEditDialogOpen(true);
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEntry) return;
    setEditFormError('');

    if (!editDate) {
      setEditFormError('Pick a date for this fill-up.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const stationName = formData.get('editFuelStation') as string;
    const dateStr = format(editDate, 'yyyy-MM-dd');
    const odometerReading = parseFloat(formData.get('editOdometerReading') as string);

    const odometerError = validateOdometer(dateStr, odometerReading, editingEntry.id);
    if (odometerError) {
      setEditFormError(odometerError);
      return;
    }

    const updatedEntry: Entry = {
      ...editingEntry,
      date: dateStr,
      fuelFilled: parseFloat(formData.get('editFuelFilled') as string),
      amountPaid: parseFloat(formData.get('editAmountPaid') as string),
      odometerReading,
      fuelStation: stationName,
    };

    try {
      await updateEntry(updatedEntry);
      setEditDialogOpen(false);
      setEditingEntry(null);
      setEditDate(undefined);
      setEditStation('');
    } catch (error) {
      console.error('Error updating entry:', error);
      setEditFormError('Could not save changes. Please try again.');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'single') {
        await deleteEntry(deleteTarget.id);
      } else {
        await clearAllEntries();
      }
    } catch (error) {
      console.error('Error deleting entries:', error);
      toast({
        title: deleteTarget.type === 'single'
          ? `Failed to delete the entry from ${deleteTarget.date}`
          : 'Failed to delete entries',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className='space-y-6'>
      {/* Hero: last measured tank + efficiency trend */}
      <Card className='overflow-hidden py-0'>
        <div className='grid md:grid-cols-[1fr_1.3fr]'>
          <div className='flex flex-col gap-3 p-5 md:border-r md:p-6'>
            <div className='flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
              Last measured tank
              {latestLeg && (
                <span className='rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs normal-case tracking-normal text-primary'>
                  {format(parseEntryDate(latestLeg.date), 'd MMM')}
                </span>
              )}
            </div>
            {latestLeg ? (
              <>
                <div className='flex flex-wrap items-baseline gap-2.5'>
                  <span className='font-mono text-5xl font-medium leading-none tracking-tight tabular-nums sm:text-6xl'>
                    {latestLeg.efficiency.toFixed(1)}
                  </span>
                  <span className='text-lg text-muted-foreground'>km/L</span>
                  {deltaPct !== null && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums',
                        deltaPct >= 0 ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                      )}
                    >
                      {deltaPct >= 0 ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className='text-sm text-muted-foreground'>
                  <span className='font-medium text-foreground'>
                    {(latestLeg.distanceTravelled as number).toLocaleString()} km
                  </span>{' '}
                  on <span className='font-medium text-foreground'>{latestLeg.fuelFilled.toFixed(2)} L</span> from{' '}
                  {latestLeg.fuelStation}
                  {trailingAvg !== null && (
                    <>
                      {' '}
                      · trailing average{' '}
                      <span className='font-medium text-foreground'>{trailingAvg.toFixed(1)} km/L</span>
                    </>
                  )}
                </p>
              </>
            ) : (
              <p className='text-sm text-muted-foreground'>
                {legs.length === 0
                  ? "Log your first fill-up and you'll see your efficiency here."
                  : "Log a second fill-up in this view to see your efficiency — it's computed from the distance between two readings."}
              </p>
            )}
          </div>
          <div className='flex flex-col gap-3 p-5 md:p-6'>
            <div className='flex items-center justify-between gap-3'>
              <span className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Efficiency trend
              </span>
              <div className='inline-flex rounded-full border bg-muted/50 p-0.5' role='group' aria-label='Time range'>
                {(['6', '12', 'all'] as const).map((r) => (
                  <button
                    key={r}
                    type='button'
                    onClick={() => setRange(r)}
                    aria-pressed={range === r}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      range === r ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {r === 'all' ? 'All' : `${r} fills`}
                  </button>
                ))}
              </div>
            </div>
            <EfficiencySparkline points={sparklinePoints} className='h-24' />
          </div>
        </div>
        {stripStats && (
          <div className='grid grid-cols-2 gap-px border-t bg-border sm:grid-cols-4'>
            <div className='flex flex-col gap-0.5 bg-card p-3.5'>
              <span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>Cost per km</span>
              <span className='font-mono text-xl font-medium tabular-nums'>₹{stripStats.avgCostPerKm.toFixed(2)}</span>
            </div>
            <div className='flex flex-col gap-0.5 bg-card p-3.5'>
              <span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>Price per litre</span>
              <span className='font-mono text-xl font-medium tabular-nums'>₹{stripStats.avgPpl.toFixed(2)}</span>
            </div>
            <div className='flex flex-col gap-0.5 bg-card p-3.5'>
              <span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>Distance logged</span>
              <span className='font-mono text-xl font-medium tabular-nums'>
                {stripStats.totalDistance.toLocaleString()} <span className='text-sm text-muted-foreground'>km</span>
              </span>
            </div>
            <div className='flex flex-col gap-0.5 bg-card p-3.5'>
              <span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>Spent</span>
              <span className='font-mono text-xl font-medium tabular-nums'>
                ₹{stripStats.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Station filter chips */}
      {stations.length > 0 && (
        <div className='flex flex-wrap gap-1.5' role='group' aria-label='Filter by station'>
          <button
            type='button'
            onClick={() => setStationFilter('All')}
            aria-pressed={stationFilter === 'All'}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              stationFilter === 'All'
                ? 'border-foreground bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All stations
          </button>
          {stations.map((s) => (
            <button
              key={s}
              type='button'
              onClick={() => setStationFilter(s)}
              aria-pressed={stationFilter === s}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                stationFilter === s
                  ? 'border-foreground bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Body: log + side rail */}
      <div className='grid gap-6 lg:grid-cols-[1.6fr_1fr]'>
        <section className='space-y-3'>
          <div className='flex items-center justify-between'>
            <h2 className='text-sm font-semibold'>Fill-up log</h2>
            <div className='flex items-center gap-3'>
              <span className='font-mono text-xs text-muted-foreground'>
                {displayLegs.length} {displayLegs.length === 1 ? 'fill' : 'fills'}
              </span>
              {entries.length > 0 && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setDeleteTarget({ type: 'all', count: entries.length })}
                  className='gap-2 text-destructive hover:text-destructive'
                >
                  <HugeiconsIcon icon={Delete02Icon} className='size-4' />
                  <span className='hidden sm:inline'>Delete All</span>
                </Button>
              )}
            </div>
          </div>

          {displayLegs.length === 0 ? (
            <div className='rounded-xl border bg-card p-12 text-center'>
              <p className='text-muted-foreground'>
                {entries.length === 0 ? 'No entries yet. Log your first fuel fill-up to get started.' : 'No fill-ups match this filter.'}
              </p>
            </div>
          ) : (
            <div className='space-y-2'>
              {displayLegs.map((leg) => (
                <LegRow
                  key={leg.id ?? leg.date}
                  leg={leg}
                  barPercent={barPercentFor(leg.efficiency)}
                  isBest={showBestWorst && leg.efficiency !== null && leg.efficiency === bestEfficiency}
                  isWorst={showBestWorst && leg.efficiency !== null && leg.efficiency === worstEfficiency}
                  onEdit={handleEdit}
                  onDelete={(id, date) => setDeleteTarget({ type: 'single', id, date })}
                />
              ))}
            </div>
          )}
        </section>

        <section className='hidden space-y-4 lg:block'>
          <Card>
            <CardHeader className='border-b py-4'>
              <CardTitle className='text-base'>Log a fill-up</CardTitle>
            </CardHeader>
            <CardContent className='pt-4'>
              <FillUpForm
                stations={stations}
                latestEntry={latestEntry}
                onValidateOdometer={validateOdometer}
                onSubmit={addEntry}
              />
            </CardContent>
          </Card>
          <StationComparisonCard legs={legs} stations={stations} />
        </section>
      </div>

      {/* Mobile: floating action button + bottom-sheet form */}
      <button
        type='button'
        onClick={() => setMobileFormOpen(true)}
        className='fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground lg:hidden'
      >
        <HugeiconsIcon icon={Add01Icon} className='size-4' />
        Log a fill-up
      </button>

      <Dialog open={mobileFormOpen} onOpenChange={setMobileFormOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            'inset-x-0 bottom-0 top-auto left-0 max-h-[85vh] max-w-full translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-b-none rounded-t-2xl p-0',
            'data-open:slide-in-from-bottom-8 data-closed:slide-out-to-bottom-8',
            'lg:inset-x-auto lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-xl'
          )}
        >
          <div className='flex items-center justify-between border-b px-5 py-4'>
            <DialogTitle className='text-base font-semibold'>Log a fill-up</DialogTitle>
            <DialogClose
              render={<Button variant='ghost' size='icon-sm' />}
            >
              <HugeiconsIcon icon={Cancel01Icon} className='size-4' strokeWidth={2} />
              <span className='sr-only'>Close</span>
            </DialogClose>
          </div>
          <div className='p-5'>
            <FillUpForm
              stations={stations}
              latestEntry={latestEntry}
              onValidateOdometer={validateOdometer}
              onSubmit={addEntry}
              onSaved={() => setMobileFormOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
            <DialogDescription>
              Make changes to the selected entry below.
            </DialogDescription>
          </DialogHeader>
          <form className='grid gap-5 sm:grid-cols-2 mt-4' onSubmit={handleEditSubmit}>
            <Field>
              <FieldLabel htmlFor='editDate'>Date</FieldLabel>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant='outline'
                      id='editDate'
                      className='justify-start font-normal w-full'
                      type='button'
                    >
                      {editDate ? format(editDate, 'PPP') : <span className='text-muted-foreground'>Pick a date</span>}
                    </Button>
                  }
                />
                <PopoverContent className='w-auto p-0' align='start'>
                  <Calendar
                    mode='single'
                    selected={editDate}
                    onSelect={setEditDate}
                    defaultMonth={editDate}
                    required
                  />
                </PopoverContent>
              </Popover>
            </Field>
            <Field>
              <FieldLabel htmlFor='editFuelStation'>Fuel Station</FieldLabel>
              <Input
                id='editFuelStation'
                name='editFuelStation'
                list='edit-stations-list'
                value={editStation}
                onChange={(e) => setEditStation(e.target.value)}
                placeholder='Search or type fuel station...'
                required
              />
              <datalist id='edit-stations-list'>
                {stations.map((station) => (
                  <option key={station} value={station} />
                ))}
              </datalist>
            </Field>
            <Field>
              <FieldLabel htmlFor='editFuelFilled'>
                Fuel Filled (L)
              </FieldLabel>
              <Input
                id='editFuelFilled'
                name='editFuelFilled'
                type='number'
                step='0.01'
                min='0'
                placeholder='e.g. 7.02'
                defaultValue={editingEntry ? editingEntry.fuelFilled : ''}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='editAmountPaid'>Amount Paid (₹)</FieldLabel>
              <Input
                id='editAmountPaid'
                name='editAmountPaid'
                type='number'
                step='0.01'
                min='0'
                placeholder='e.g. 690.67'
                defaultValue={editingEntry ? editingEntry.amountPaid : ''}
                required
              />
            </Field>
            <Field className='sm:col-span-2'>
              <FieldLabel htmlFor='editOdometerReading'>
                Odometer Reading (km)
              </FieldLabel>
              <Input
                id='editOdometerReading'
                name='editOdometerReading'
                type='number'
                step='0.01'
                min='0'
                placeholder='e.g. 12345'
                defaultValue={editingEntry ? editingEntry.odometerReading : ''}
                required
              />
            </Field>
            {editFormError && (
              <div className='sm:col-span-2 bg-destructive/10 text-destructive text-sm p-3 rounded-md'>
                {editFormError}
              </div>
            )}
            <div className='sm:col-span-2 flex gap-3 justify-end pt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type='submit'>
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — shared between single-entry and delete-all */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === 'single' ? 'Delete this entry?' : `Delete all ${deleteTarget?.count ?? ''} entries?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'single'
                ? `This removes the fill-up from ${deleteTarget.date}. This can't be undone.`
                : "This removes every fill-up you've logged. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className='bg-destructive text-white hover:bg-destructive/90'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// One row in the fill-up log: the leg between this fill-up and the previous
// (older) one — distance covered, litres burned, the resulting km/L — rather
// than a raw odometer reading the reader would have to subtract by hand.
type LegRowProps = {
  leg: Leg;
  barPercent: number | null;
  isBest: boolean;
  isWorst: boolean;
  onEdit: (entry: Entry) => void;
  onDelete: (id: number, date: string) => void;
};

function LegRow({ leg, barPercent, isBest, isWorst, onEdit, onDelete }: LegRowProps) {
  const parsedDate = parseEntryDate(leg.date);

  return (
    <div className='grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 sm:grid-cols-[56px_1fr_auto]'>
      <div className='flex flex-col leading-tight'>
        <span className='font-mono text-base font-semibold tabular-nums'>{format(parsedDate, 'dd')}</span>
        <span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
          {format(parsedDate, 'MMM yy')}
        </span>
      </div>
      <div className='flex min-w-0 flex-col gap-1.5'>
        <div className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground'>
          <span className='font-medium text-foreground'>{leg.fuelStation}</span>
          {leg.distanceTravelled !== null ? (
            <>
              <span className='text-muted-foreground/40'>·</span>
              <span className='font-mono tabular-nums'>{leg.distanceTravelled.toLocaleString()} km</span>
              <span className='text-muted-foreground/40'>·</span>
              <span className='font-mono tabular-nums'>{leg.fuelFilled.toFixed(2)} L</span>
              <span className='text-muted-foreground/40'>·</span>
              <span className='font-mono tabular-nums'>₹{leg.amountPaid.toFixed(2)}</span>
              {isBest && (
                <span className='rounded bg-success/15 px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-wide text-success'>
                  best
                </span>
              )}
              {isWorst && (
                <span className='rounded bg-warning/15 px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-wide text-warning'>
                  lowest
                </span>
              )}
            </>
          ) : (
            <span>first fill logged — no earlier reading to measure against</span>
          )}
        </div>
        {barPercent !== null && (
          <div className='h-1 max-w-70 overflow-hidden rounded-full bg-muted'>
            <div className='h-full rounded-full bg-chart-1' style={{ width: `${barPercent}%` }} />
          </div>
        )}
      </div>
      <div className='flex items-center gap-0.5'>
        <div className='mr-1 text-right leading-tight'>
          <div className='font-mono text-lg font-semibold tabular-nums'>
            {leg.efficiency !== null ? leg.efficiency.toFixed(1) : '—'}
          </div>
          <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>km/L</div>
        </div>
        <Button
          size='sm'
          variant='ghost'
          className='h-8 w-8 p-0'
          onClick={() => onEdit(leg)}
          aria-label={`Edit entry from ${leg.date}`}
          title='Edit entry'
        >
          <HugeiconsIcon icon={PencilEdit01Icon} className='size-4' />
        </Button>
        <Button
          size='sm'
          variant='ghost'
          className='h-8 w-8 p-0 text-destructive hover:text-destructive'
          onClick={() => leg.id !== undefined && onDelete(leg.id, leg.date)}
          aria-label={`Delete entry from ${leg.date}`}
          title='Delete entry'
        >
          <HugeiconsIcon icon={Delete01Icon} className='size-4' />
        </Button>
      </div>
    </div>
  );
}

type StationComparisonCardProps = {
  legs: Leg[];
  stations: string[];
};

function StationComparisonCard({ legs, stations }: StationComparisonCardProps) {
  const rows = useMemo(() => {
    return stations
      .map((station) => {
        const stationLegs = legs.filter(
          (l): l is Leg & { efficiency: number } => l.fuelStation === station && l.efficiency !== null
        );
        const avg = stationLegs.length > 0 ? stationLegs.reduce((sum, l) => sum + l.efficiency, 0) / stationLegs.length : 0;
        return { station, avg, count: stationLegs.length };
      })
      .filter((r) => r.count > 0)
      .sort((a, b) => b.avg - a.avg);
  }, [legs, stations]);

  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.avg));

  return (
    <Card>
      <CardHeader className='border-b py-4'>
        <CardTitle className='text-base'>By station</CardTitle>
        <CardDescription className='text-xs'>Average km/L at each station</CardDescription>
      </CardHeader>
      <CardContent className='space-y-3 pt-4'>
        {rows.map((r) => (
          <div key={r.station} className='space-y-1'>
            <div className='flex items-center justify-between gap-2 text-xs'>
              <span className='truncate font-medium'>{r.station}</span>
              <span className='font-mono tabular-nums text-muted-foreground'>
                {r.avg.toFixed(1)} <span className='text-muted-foreground/70'>· {r.count} {r.count === 1 ? 'tank' : 'tanks'}</span>
              </span>
            </div>
            <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
              <div className='h-full rounded-full bg-chart-1' style={{ width: `${(r.avg / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

type FillUpFormProps = {
  stations: string[];
  latestEntry: Entry | null;
  onValidateOdometer: (dateStr: string, odometerReading: number) => string | null;
  onSubmit: (entry: Omit<Entry, 'id' | 'userId'>) => Promise<number>;
  onSaved?: () => void;
};

// Used in two places at once (the desktop side rail and the mobile bottom
// sheet — only one is ever visible, but both stay mounted so the layout
// switch is a pure CSS media query rather than a remount). Each instance
// needs its own ids: two mounted <input list="stations-list"> elements with
// the same id would mean the browser only honours one of them.
function FillUpForm({ stations, latestEntry, onValidateOdometer, onSubmit, onSaved }: FillUpFormProps) {
  const uid = useId();
  const [date, setDate] = useState<Date>();
  const [station, setStation] = useState('');
  const [litres, setLitres] = useState('');
  const [amount, setAmount] = useState('');
  const [odometer, setOdometer] = useState('');
  const [formError, setFormError] = useState('');

  const litresNum = parseFloat(litres);
  const amountNum = parseFloat(amount);
  const odometerNum = parseFloat(odometer);

  const pricePerLitre = litresNum > 0 && amountNum > 0 ? amountNum / litresNum : null;

  const preview = useMemo(() => {
    if (!latestEntry || !Number.isFinite(odometerNum) || !(litresNum > 0)) return null;
    const distance = odometerNum - latestEntry.odometerReading;
    if (distance <= 0) return { invalid: true as const, distance: null };
    return { invalid: false as const, distance, efficiency: distance / litresNum };
  }, [latestEntry, odometerNum, litresNum]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    if (!date) {
      setFormError('Pick a date for this fill-up.');
      return;
    }
    if (!station.trim()) {
      setFormError('Enter a fuel station.');
      return;
    }
    if (!(litresNum > 0) || !(amountNum > 0) || !Number.isFinite(odometerNum) || odometerNum < 0) {
      setFormError('Fill in litres, amount, and odometer with valid numbers.');
      return;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    const odometerError = onValidateOdometer(dateStr, odometerNum);
    if (odometerError) {
      setFormError(odometerError);
      return;
    }

    try {
      await onSubmit({
        date: dateStr,
        fuelFilled: litresNum,
        amountPaid: amountNum,
        odometerReading: odometerNum,
        fuelStation: station.trim(),
      });
      setDate(undefined);
      setStation('');
      setLitres('');
      setAmount('');
      setOdometer('');
      onSaved?.();
    } catch (error) {
      console.error('Error adding entry:', error);
      setFormError('Could not save this entry. Please try again.');
    }
  }

  return (
    <form className='space-y-4' onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor={`${uid}-date`}>Date</FieldLabel>
        <Popover>
          <PopoverTrigger
            render={
              <Button variant='outline' id={`${uid}-date`} className='w-full justify-start font-normal' type='button'>
                {date ? format(date, 'PPP') : <span className='text-muted-foreground'>Pick a date</span>}
              </Button>
            }
          />
          <PopoverContent className='w-auto p-0' align='start'>
            <Calendar mode='single' selected={date} onSelect={setDate} defaultMonth={date} required />
          </PopoverContent>
        </Popover>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${uid}-station`}>Fuel Station</FieldLabel>
        <Input
          id={`${uid}-station`}
          list={`${uid}-stations-list`}
          value={station}
          onChange={(e) => setStation(e.target.value)}
          placeholder='Search or type fuel station...'
          required
        />
        <datalist id={`${uid}-stations-list`}>
          {stations.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Field>

      <div className='grid grid-cols-2 gap-3'>
        <Field>
          <FieldLabel htmlFor={`${uid}-litres`}>Litres</FieldLabel>
          <Input
            id={`${uid}-litres`}
            type='number'
            step='0.01'
            min='0'
            value={litres}
            onChange={(e) => setLitres(e.target.value)}
            placeholder='e.g. 7.02'
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-amount`}>Amount (₹)</FieldLabel>
          <Input
            id={`${uid}-amount`}
            type='number'
            step='0.01'
            min='0'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder='e.g. 690.67'
            required
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={`${uid}-odometer`}>Odometer (km)</FieldLabel>
        <Input
          id={`${uid}-odometer`}
          type='number'
          step='0.01'
          min='0'
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          placeholder='e.g. 12345'
          required
        />
      </Field>

      {pricePerLitre !== null && (
        <div className='flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs'>
          <span className='text-muted-foreground'>Works out to</span>
          <span className='font-mono font-semibold tabular-nums'>₹{pricePerLitre.toFixed(2)} / L</span>
        </div>
      )}

      {preview && !preview.invalid && (
        <div className='flex items-center justify-between rounded-md bg-chart-1/10 px-3 py-2 text-xs'>
          <span className='text-muted-foreground'>This tank would read</span>
          <span className='font-mono font-semibold tabular-nums text-chart-1'>
            {preview.efficiency.toFixed(1)} km/L · {preview.distance.toLocaleString()} km
          </span>
        </div>
      )}

      {preview?.invalid && latestEntry && (
        <div className='rounded-md bg-warning/10 px-3 py-2 text-xs text-warning'>
          The odometer needs to be above {latestEntry.odometerReading.toLocaleString()} km — your last logged
          reading. Check for a missing digit.
        </div>
      )}

      {formError && <div className='rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive'>{formError}</div>}

      <Button type='submit' className='w-full gap-2'>
        <HugeiconsIcon icon={Add01Icon} className='size-4' />
        Save fill-up
      </Button>
    </form>
  );
}

export { Entries };
