import { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import {
  Download01Icon,
  FuelStationIcon,
  Upload01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Textarea } from './components/ui/textarea';
import { Field, FieldLabel } from './components/ui/field';
import { Entries } from './components/entries';
import { Statistics } from './components/statistics';
import { useIndexedDBEntries, type Entry } from './lib/useIndexedDB';

export function App() {
  const { entries, isLoading, replaceAllEntries, addEntry, updateEntry, deleteEntry, moveEntry, clearAllEntries } = useIndexedDBEntries();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Download entries as CSV
  function handleDownload() {
    if (entries.length === 0) {
      alert('No entries to export!');
      return;
    }
    
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
    setImportDialogOpen(true);
  }

  function handleFileUploadClick() {
    fileInputRef.current?.click();
  }

  function parseCsvText(content: string): Omit<Entry, 'id'>[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const hasHeader = lines[0].toLowerCase().includes('date') || lines[0].toLowerCase().includes('amount');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    
    return dataLines.map(line => {
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
  }

  async function handleImportText() {
    if (!csvText.trim()) {
      alert('Please enter CSV data.');
      return;
    }

    try {
      const parsedEntries = parseCsvText(csvText);
      
      if (parsedEntries.length > 0) {
        const confirmMessage = `Found ${parsedEntries.length} entries. Replace current data?`;
        if (confirm(confirmMessage)) {
          await replaceAllEntries(parsedEntries);
          alert('Data imported successfully!');
          setImportDialogOpen(false);
          setCsvText('');
        }
      } else {
        alert('No valid entries found in the CSV data.');
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV data. Please check the format and try again.');
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        let parsedEntries: Omit<Entry, 'id'>[] = [];

        if (file.name.endsWith('.json')) {
          // Parse JSON
          const jsonData = JSON.parse(content) as Entry[];
          parsedEntries = jsonData.map((entry) => ({
            date: entry.date,
            amountPaid: entry.amountPaid,
            odometerReading: entry.odometerReading,
            fuelFilled: entry.fuelFilled,
            fuelStation: entry.fuelStation,
          }));
        } else if (file.name.endsWith('.csv')) {
          // Parse CSV
          parsedEntries = parseCsvText(content);
        } else {
          alert('Unsupported file format. Please upload a CSV or JSON file.');
          return;
        }

        if (parsedEntries.length > 0) {
          const confirmMessage = `Found ${parsedEntries.length} entries. Replace current data?`;
          if (confirm(confirmMessage)) {
            await replaceAllEntries(parsedEntries);
            alert('Data imported successfully!');
            setImportDialogOpen(false);
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
        accept='.csv,.json'
        style={{ display: 'none' }}
      />
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
            <DialogDescription>
              Upload a CSV or JSON file, or paste CSV data directly below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleFileUploadClick}
              >
                <HugeiconsIcon icon={Upload01Icon} className="size-4 mr-2" />
                Choose File
              </Button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or paste CSV data</span>
              </div>
            </div>

            <Field>
              <FieldLabel htmlFor="csv-data">CSV Data</FieldLabel>
              <Textarea
                id="csv-data"
                placeholder="Date,Amount Paid,Odometer Reading,Fuel Filled,Fuel Station&#10;2026/02/18,800,10250,8.5,Shell Station"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={8}
                className="font-mono text-sm max-h-70 overflow-auto"
              />
            </Field>

            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setImportDialogOpen(false);
                  setCsvText('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleImportText}
                disabled={!csvText.trim()}
              >
                Import from Text
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <main className='container mx-auto px-4 md:px-6 lg:px-8 py-4'>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-100">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading your data...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue='entries' className='space-y-2'>
            <TabsList className='grid w-full max-w-md mx-auto grid-cols-2 h-auto!'>
              <TabsTrigger value='entries' className='text-base'>
                Entries
              </TabsTrigger>
              <TabsTrigger value='statistics' className='text-base'>
                Statistics
              </TabsTrigger>
            </TabsList>
            <TabsContent value='entries' className='space-y-6'>
              <Entries 
                entries={entries} 
                addEntry={addEntry}
                updateEntry={updateEntry}
                deleteEntry={deleteEntry}
                moveEntry={moveEntry}
                clearAllEntries={clearAllEntries}
              />
            </TabsContent>
            <TabsContent value='statistics' className='space-y-6'>
              <Statistics entries={entries} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default App;
