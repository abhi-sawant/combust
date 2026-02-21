import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Field, FieldLabel } from './ui/field';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format, parse } from 'date-fns';
import { Input } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  PencilEdit01Icon,
  Delete01Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';

type Entry = {
  id?: number;
  userId: number;
  date: string;
  amountPaid: number;
  odometerReading: number;
  fuelFilled: number;
  fuelStation: string;
};

type EntriesProps = {
  entries: Entry[];
  addEntry: (entry: Omit<Entry, 'id' | 'userId'>) => Promise<number>;
  updateEntry: (entry: Entry) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  moveEntry: (fromIndex: number, toIndex: number) => void;
  clearAllEntries: () => Promise<void>;
};

function Entries({ entries, addEntry, updateEntry, deleteEntry, moveEntry, clearAllEntries }: EntriesProps) {
  const [date, setDate] = useState<Date>();
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<Date>();
  const [editStation, setEditStation] = useState<string>('');
  
  // Derive unique fuel stations from entries
  const stations = useMemo(() => {
    return Array.from(new Set(entries.map((entry) => entry.fuelStation)));
  }, [entries]);
  
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const stationName = formData.get('fuelStation') as string;
    
    const newEntry = {
      date: date ? format(date, 'yyyy/MM/dd') : '',
      fuelFilled: parseFloat(formData.get('fuelFilled') as string),
      amountPaid: parseFloat(formData.get('amountPaid') as string),
      odometerReading: parseFloat(formData.get('odometerReading') as string),
      fuelStation: stationName,
    };
    
    addEntry(newEntry);
    
    event.currentTarget.reset();
    setDate(undefined);
    setSelectedStation('');
  }

  function handleEdit(index: number) {
    const entry = entries[index];
    setEditingIndex(index);
    setEditDate(parse(entry.date, 'yyyy/MM/dd', new Date()));
    setEditStation(entry.fuelStation);
    setEditDialogOpen(true);
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingIndex === null) return;

    const formData = new FormData(event.currentTarget);
    const stationName = formData.get('editFuelStation') as string;
    const entry = entries[editingIndex];
    
    const updatedEntry = {
      id: entry.id,
      userId: entry.userId,
      date: editDate ? format(editDate, 'yyyy/MM/dd') : entry.date,
      fuelFilled: parseFloat(formData.get('editFuelFilled') as string),
      amountPaid: parseFloat(formData.get('editAmountPaid') as string),
      odometerReading: parseFloat(formData.get('editOdometerReading') as string),
      fuelStation: stationName,
    };

    if (updatedEntry.id !== undefined) {
      updateEntry(updatedEntry as Entry);
    }

    setEditDialogOpen(false);
    setEditingIndex(null);
    setEditDate(undefined);
    setEditStation('');
  }

  function handleDelete(index: number) {
    const entry = entries[index];
    if (entry.id !== undefined && confirm('Are you sure you want to delete this entry?')) {
      deleteEntry(entry.id);
    }
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    moveEntry(index, index - 1);
  }

  function handleMoveDown(index: number) {
    if (index === entries.length - 1) return;
    moveEntry(index, index + 1);
  }

  async function handleDeleteAll() {
    if (entries.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete all ${entries.length} entries? This action cannot be undone.`;
    if (confirm(confirmMessage)) {
      try {
        await clearAllEntries();
      } catch (error) {
        console.error('Error deleting all entries:', error);
        alert('Failed to delete entries. Please try again.');
      }
    }
  }

  return (
    <div className='space-y-8'>
      <section className='rounded-xl border bg-card shadow-sm'>
        <div className='border-b bg-muted/50 px-6 py-4'>
          <h2 className='text-lg font-semibold'>Add New Entry</h2>
          <p className='text-sm text-muted-foreground mt-1'>Record your latest fuel fill-up</p>
        </div>
        <div className='p-6'>
          <form className='grid gap-5 sm:grid-cols-2' onSubmit={handleSubmit}>
            <Field>
              <FieldLabel htmlFor='date'>Date</FieldLabel>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant='outline'
                      id='date'
                      className='justify-start font-normal w-full'
                      type='button'
                    >
                      {date ? format(date, 'PPP') : <span className='text-muted-foreground'>Pick a date</span>}
                    </Button>
                  }
                />
                <PopoverContent className='w-auto p-0' align='start'>
                  <Calendar
                    mode='single'
                    selected={date}
                    onSelect={setDate}
                    defaultMonth={date}
                    required
                  />
                </PopoverContent>
              </Popover>
            </Field>
            <Field>
              <FieldLabel htmlFor='fuelStation'>Fuel Station</FieldLabel>
              <Input
                id='fuelStation'
                name='fuelStation'
                list='stations-list'
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                placeholder='Search or type fuel station...'
                required
              />
              <datalist id='stations-list'>
                {stations.map((station) => (
                  <option key={station} value={station} />
                ))}
              </datalist>
            </Field>
            <Field>
              <FieldLabel htmlFor='fuelFilled'>
                Fuel Filled (L)
              </FieldLabel>
              <Input
                id='fuelFilled'
                name='fuelFilled'
                type='number'
                step='0.01'
                min='0'
                placeholder='e.g. 7.02'
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='amountPaid'>Amount Paid (₹)</FieldLabel>
              <Input
                id='amountPaid'
                name='amountPaid'
                type='number'
                step='0.01'
                min='0'
                placeholder='e.g. 690.67'
                required
              />
            </Field>
            <Field className='sm:col-span-2'>
              <FieldLabel htmlFor='odometerReading'>
                Odometer Reading (km)
              </FieldLabel>
              <Input
                id='odometerReading'
                name='odometerReading'
                type='number'
                step='0.01'
                min='0'
                placeholder='e.g. 12345'
                required
              />
            </Field>
            <div className='sm:col-span-2 flex justify-end'>
              <Button type='submit' size='lg' className='min-w-50'>
                Add Entry
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-semibold'>Your Entries</h2>
            <p className='text-sm text-muted-foreground mt-1'>{entries.length} total entries</p>
          </div>
          {entries.length > 0 && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleDeleteAll}
              className='text-destructive hover:text-destructive gap-2'
            >
              <HugeiconsIcon icon={Delete02Icon} className='size-4' />
              <span className='hidden sm:inline'>Delete All</span>
            </Button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className='rounded-xl border bg-card shadow-sm p-12 text-center'>
            <p className='text-muted-foreground'>No entries yet. Add your first fuel fill-up above.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className='md:hidden space-y-3'>
              {entries.map((entry, index) => (
                <div key={index} className='rounded-lg border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow'>
                  <div className='bg-muted/50 px-4 py-2 flex items-center justify-between'>
                    <div className='font-semibold text-sm'>{entry.date}</div>
                    <span className='inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'>
                      {entry.fuelStation}
                    </span>
                  </div>
                  <div className='p-4 space-y-3'>
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <div className='text-xs text-muted-foreground mb-1'>Fuel Filled</div>
                        <div className='font-semibold'>{entry.fuelFilled.toFixed(2)} L</div>
                      </div>
                      <div>
                        <div className='text-xs text-muted-foreground mb-1'>Amount Paid</div>
                        <div className='font-semibold'>₹{entry.amountPaid.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className='text-xs text-muted-foreground mb-1'>Odometer</div>
                        <div className='font-semibold'>{entry.odometerReading.toLocaleString()} km</div>
                      </div>
                      <div>
                        <div className='text-xs text-muted-foreground mb-1'>Average</div>
                        <div className='font-semibold text-primary'>
                          {entries[index - 1]?.odometerReading ? ((entries[index - 1].odometerReading - entry.odometerReading) / entry.fuelFilled).toFixed(2) : '-'}  km/L
                        </div>
                      </div>
                    </div>
                    <div className='flex gap-2 pt-2 border-t'>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className='flex-1'
                      >
                        <HugeiconsIcon icon={ArrowUp01Icon} className='size-4 mr-1' />
                        Up
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleMoveDown(index)}
                        disabled={index === entries.length - 1}
                        className='flex-1'
                      >
                        <HugeiconsIcon icon={ArrowDown01Icon} className='size-4 mr-1' />
                        Down
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleEdit(index)}
                        className='flex-1'
                      >
                        <HugeiconsIcon icon={PencilEdit01Icon} className='size-4 mr-1' />
                        Edit
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleDelete(index)}
                        className='text-destructive hover:text-destructive'
                      >
                        <HugeiconsIcon icon={Delete01Icon} className='size-4' />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className='hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/50 hover:bg-muted/50'>
                      <TableHead className='font-semibold'>Date</TableHead>
                      <TableHead className='font-semibold'>Fuel (L)</TableHead>
                      <TableHead className='font-semibold'>Amount (₹)</TableHead>
                      <TableHead className='font-semibold'>Odometer (km)</TableHead>
                      <TableHead className='font-semibold'>Average (km/L)</TableHead>
                      <TableHead className='font-semibold'>Station</TableHead>
                      <TableHead className='font-semibold text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => (
                      <TableRow key={index} className='hover:bg-muted/30 transition-colors'>
                        <TableCell className='font-medium'>{entry.date}</TableCell>
                        <TableCell>{entry.fuelFilled.toFixed(2)}</TableCell>
                        <TableCell>₹{entry.amountPaid.toFixed(2)}</TableCell>
                        <TableCell>{entry.odometerReading.toLocaleString()}</TableCell>
                        <TableCell className='font-medium'>
                          {entries[index - 1]?.odometerReading ? ((entries[index - 1].odometerReading - entry.odometerReading) / entry.fuelFilled).toFixed(2) : '-'} 
                        </TableCell>
                        <TableCell>
                          <span className='inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'>
                            {entry.fuelStation}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className='flex justify-end gap-1'>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              title='Move up'
                              className='h-8 w-8 p-0'
                            >
                              <HugeiconsIcon icon={ArrowUp01Icon} className='size-4' />
                            </Button>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => handleMoveDown(index)}
                              disabled={index === entries.length - 1}
                              title='Move down'
                              className='h-8 w-8 p-0'
                            >
                              <HugeiconsIcon icon={ArrowDown01Icon} className='size-4' />
                            </Button>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => handleEdit(index)}
                              title='Edit entry'
                              className='h-8 w-8 p-0'
                            >
                              <HugeiconsIcon icon={PencilEdit01Icon} className='size-4' />
                            </Button>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => handleDelete(index)}
                              title='Delete entry'
                              className='h-8 w-8 p-0 text-destructive hover:text-destructive'
                            >
                              <HugeiconsIcon icon={Delete01Icon} className='size-4' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </section>

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
                list='stations-list'
                value={editStation}
                onChange={(e) => setEditStation(e.target.value)}
                placeholder='Search or type fuel station...'
                required
              />
              <datalist id='stations-list'>
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
                defaultValue={editingIndex !== null ? entries[editingIndex].fuelFilled : ''}
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
                defaultValue={editingIndex !== null ? entries[editingIndex].amountPaid : ''}
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
                defaultValue={editingIndex !== null ? entries[editingIndex].odometerReading : ''}
                required
              />
            </Field>
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
    </div>
  );
}

export { Entries };
