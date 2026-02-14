import { useState } from 'react';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Field, FieldLabel } from './ui/field';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { Input } from './ui/input';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from './ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Separator } from './ui/separator';
import { data, fuelStations } from '../data';

function Entries() {
  const [date, setDate] = useState<Date>();
  const [entries, setEntries] = useState(data.reverse());
  const [stations, setStations] = useState<string[]>(fuelStations);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStationName, setNewStationName] = useState('');
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newEntry = {
      date: date ? format(date, 'yyyy/MM/dd') : '',
      fuelFilled: parseFloat(formData.get('fuelFilled') as string),
      amountPaid: parseFloat(formData.get('amountPaid') as string),
      odometerReading: parseFloat(formData.get('odometerReading') as string),
      fuelStation: selectedStation,
    };
    setEntries((prevEntries) => [...prevEntries, newEntry]);
    event.currentTarget.reset();
    setDate(undefined);
    setSelectedStation('');
  }

  function handleAddNewStation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newStationName.trim()) {
      setStations((prev) => [...prev, newStationName]);
      setSelectedStation(newStationName);
      setDialogOpen(false);
      setNewStationName('');
    }
  }
  return (
    <>
      <section>
        <h2 className='text-center text-xl font-bold'>New entry</h2>
        <form className='grid gap-2' onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor='date'>Date</FieldLabel>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant='outline'
                    id='date'
                    className='justify-start font-normal'
                    type='button'
                  >
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
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
            <FieldLabel htmlFor='fuelFilled'>
              Fuel Filled (in liters)
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
            <FieldLabel htmlFor='amountPaid'>Amount Paid (in INR)</FieldLabel>
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
          <Field>
            <FieldLabel htmlFor='odometerReading'>
              Odometer Reading (in km)
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
          <Field>
            <FieldLabel htmlFor='fuelStation'>Fuel Station</FieldLabel>
            <Combobox
              value={selectedStation}
              onValueChange={(value) => setSelectedStation(value || '')}
              name='fuelStation'
            >
              <ComboboxInput
                id='fuelStation'
                placeholder='Search fuel station...'
                showClear
                required
              />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No station found.</ComboboxEmpty>
                  {stations.map((station) => (
                    <ComboboxItem key={station} value={station}>
                      {station}
                    </ComboboxItem>
                  ))}
                  <ComboboxItem
                    key='add-new'
                    value='__add_new__'
                    onSelect={() => {
                      setDialogOpen(true);
                      setSelectedStation('');
                    }}
                  >
                    + Add new station
                  </ComboboxItem>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
          <Button className='ms-auto' type='submit'>
            Add entry
          </Button>
        </form>
      </section>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Fuel Station</DialogTitle>
            <DialogDescription>
              Enter the name of the new fuel station.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddNewStation}>
            <Field>
              <FieldLabel htmlFor='newStationName'>Station Name</FieldLabel>
              <Input
                id='newStationName'
                value={newStationName}
                onChange={(e) => setNewStationName(e.target.value)}
                placeholder='e.g. IOCL Station'
                required
              />
            </Field>
            <DialogFooter className='mt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setDialogOpen(false);
                  setNewStationName('');
                }}
              >
                Cancel
              </Button>
              <Button type='submit'>Add Station</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Separator className='my-4' />
      <section>
        <h2 className='text-center text-xl font-bold'>Your entries</h2>
        <Table className='border'>
          <TableHeader>
            <TableRow>
              <TableHead scope='col' className='bg-secondary'>
                Date
              </TableHead>
              <TableHead scope='col' className='bg-secondary'>
                Fuel
              </TableHead>
              <TableHead scope='col' className='bg-secondary'>
                Amount
              </TableHead>
              <TableHead scope='col' className='bg-secondary'>
                Odometer
              </TableHead>
              <TableHead scope='col' className='bg-secondary'>
                Station
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow key={index}>
                <TableCell>{entry.date}</TableCell>
                <TableCell>{entry.fuelFilled}</TableCell>
                <TableCell>{entry.amountPaid}</TableCell>
                <TableCell>{entry.odometerReading}</TableCell>
                <TableCell>{entry.fuelStation}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </>
  );
}

export { Entries };
