import { useState, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import {
  Download01Icon,
  FuelStationIcon,
  Upload01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from './components/ui/button';
import { Entries } from './components/entries';
import { Statistics } from './components/statistics';
import { data } from './data';

type Entry = {
  date: string;
  amountPaid: number;
  odometerReading: number;
  fuelFilled: number;
  fuelStation: string;
};

export function App() {
  const [entries, setEntries] = useState(data);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download entries as CSV
  function handleDownload() {
    const headers = ['Date', 'Amount Paid', 'Odometer Reading', 'Fuel Filled', 'Fuel Station'];
    const csvRows = [
      headers.join(','),
      ...entries.map(entry => [
        entry.date,
        entry.amountPaid,
        entry.odometerReading,
        entry.fuelFilled,
        `"${entry.fuelStation}"`, // Quote station name to handle commas
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `combust-data-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Handle file upload
  function handleUpload() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        let parsedEntries: Entry[] = [];

        if (file.name.endsWith('.json')) {
          // Parse JSON
          parsedEntries = JSON.parse(content);
        } else if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
          // Parse CSV
          const lines = content.split('\n').filter(line => line.trim());
          const hasHeader = lines[0].toLowerCase().includes('date') || lines[0].toLowerCase().includes('amount');
          const dataLines = hasHeader ? lines.slice(1) : lines;
          
          parsedEntries = dataLines.map(line => {
            // Handle quoted values
            const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.trim().replace(/^"|"$/g, '')) || [];
            
            return {
              date: values[0] || '',
              amountPaid: parseFloat(values[1] || '0'),
              odometerReading: parseFloat(values[2] || '0'),
              fuelFilled: parseFloat(values[3] || '0'),
              fuelStation: values[4] || '',
            };
          }).filter(entry => entry.date && entry.amountPaid > 0);
        } else {
          alert('Unsupported file format. Please upload a CSV, JSON, or TXT file.');
          return;
        }

        if (parsedEntries.length > 0) {
          const confirmMessage = `Found ${parsedEntries.length} entries. Replace current data?`;
          if (confirm(confirmMessage)) {
            setEntries(parsedEntries);
            alert('Data imported successfully!');
          }
        } else {
          alert('No valid entries found in the file.');
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please check the format and try again.');
      }
    };

    reader.readAsText(file);
    // Reset input so the same file can be uploaded again
    event.target.value = '';
  }
  return (
    <div className='min-h-screen bg-linear-to-br from-background via-background to-muted/20'>
      <header className='border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50 shadow-sm'>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 shadow-lg shadow-primary/20'>
                <HugeiconsIcon
                  icon={FuelStationIcon}
                  className='size-5 text-primary-foreground'
                  strokeWidth={2.5}
                />
              </div>
              <div>
                <h1 className='text-2xl font-bold tracking-tight'>Combust</h1>
                <p className='text-xs text-muted-foreground'>Fuel Tracking Made Simple</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='gap-2'
                onClick={handleUpload}
              >
                <HugeiconsIcon icon={Upload01Icon} className='size-4' />
                <span className='hidden sm:inline'>Import</span>
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='gap-2'
                onClick={handleDownload}
              >
                <HugeiconsIcon icon={Download01Icon} className='size-4' />
                <span className='hidden sm:inline'>Export</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <input
        type='file'
        ref={fileInputRef}
        onChange={handleFileChange}
        accept='.csv,.json,.txt'
        style={{ display: 'none' }}
      />
      <main className='container mx-auto px-4 md:px-6 lg:px-8 py-4'>
        <Tabs defaultValue='entries' className='space-y-2'>
          <TabsList className='grid w-full max-w-md mx-auto grid-cols-2 h-12'>
            <TabsTrigger value='entries' className='text-base'>
              Entries
            </TabsTrigger>
            <TabsTrigger value='statistics' className='text-base'>
              Statistics
            </TabsTrigger>
          </TabsList>
          <TabsContent value='entries' className='space-y-6'>
            <Entries entries={entries} setEntries={setEntries} />
          </TabsContent>
          <TabsContent value='statistics' className='space-y-6'>
            <Statistics entries={entries} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
