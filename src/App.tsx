import { useRef, useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import {
  Download01Icon,
  FuelStationIcon,
  Upload01Icon,
  Logout01Icon,
  Menu01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from './components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './components/ui/alert-dialog';
import { Textarea } from './components/ui/textarea';
import { Field, FieldLabel } from './components/ui/field';
import { useToast } from './components/ui/toast';
import { Entries } from './components/entries';
import { ThemeToggle } from './components/ThemeToggle';
import { useAuth } from './contexts/AuthContext';
import { SignIn } from './components/auth/SignIn';
import { SignUp } from './components/auth/SignUp';
import { EmailConfirmation } from './components/auth/EmailConfirmation';
import * as fuelService from './services/fuelService';
import { type Entry } from './types';

// Recharts is a sizeable dependency that most sessions never need on first
// paint (the Entries tab is the default view) — split it into its own chunk.
const Statistics = lazy(() =>
  import('./components/statistics').then((m) => ({ default: m.Statistics }))
);

export function App() {
  const { user, isLoading: authLoading, signOut, authState, clearAwaitingConfirmation } = useAuth();
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [confirmationEmail, setConfirmationEmail] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Entries state
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [pendingImport, setPendingImport] = useState<{ entries: Omit<Entry, 'id' | 'userId'>[]; rejectedCount: number } | null>(null);

  // Load entries when user changes
  useEffect(() => {
    async function loadEntries() {
      if (!user?.id) {
        setEntries([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const loadedEntries = await fuelService.getAllEntries(user.id, user.supabaseId);
        setEntries(loadedEntries as Entry[]);
      } catch (error) {
        console.error('Error loading entries:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadEntries();
  }, [user?.id, user?.supabaseId]);

  // Listen for online status changes to sync
  useEffect(() => {
    const handleOnline = async () => {
      if (user?.id && user?.supabaseId) {
        console.log('Back online, syncing...');
        try {
          await fuelService.fullSync(user.id, user.supabaseId);
          const loadedEntries = await fuelService.getAllEntries(user.id, user.supabaseId);
          setEntries(loadedEntries as Entry[]);
        } catch (error) {
          console.error('Error syncing on reconnect:', error);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user?.id, user?.supabaseId]);

  // Entry CRUD operations
  const addEntry = useCallback(async (entry: Omit<Entry, 'id' | 'userId'>) => {
    if (!user?.id) return -1;
    
    try {
      const newEntry = await fuelService.createEntry(entry, user.id, user.supabaseId);
      setEntries(prev => [newEntry as Entry, ...prev]);
      return newEntry.id || -1;
    } catch (error) {
      console.error('Error adding entry:', error);
      throw error;
    }
  }, [user?.id, user?.supabaseId]);

  const updateEntry = useCallback(async (entry: Entry) => {
    if (!user?.id) return;
    
    try {
      await fuelService.updateEntry(entry, user.supabaseId);
      setEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
    } catch (error) {
      console.error('Error updating entry:', error);
      throw error;
    }
  }, [user?.id, user?.supabaseId]);

  const deleteEntry = useCallback(async (id: number) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    
    try {
      await fuelService.deleteEntry(id, entry.supabaseId, user?.supabaseId);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }
  }, [entries, user?.supabaseId]);

  const clearAllEntries = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Soft-deletes in Supabase with one request instead of one per entry.
      const deletable = entries.filter((e): e is Entry & { id: number } => e.id !== undefined);
      await fuelService.bulkDeleteEntries(deletable, user.supabaseId);
      setEntries([]);
    } catch (error) {
      console.error('Error clearing entries:', error);
      throw error;
    }
  }, [entries, user?.id, user?.supabaseId]);

  const replaceAllEntries = useCallback(async (newEntries: Omit<Entry, 'id' | 'userId'>[]) => {
    if (!user?.id) return;

    try {
      // Insert the new entries before removing the old ones: if the import
      // fails, nothing is lost. If the cleanup afterwards fails, the worst
      // case is leftover old rows still visible — recoverable, unlike having
      // wiped the account and then failed to repopulate it.
      const addedEntries = await fuelService.bulkCreateEntries(newEntries, user.id, user.supabaseId);

      const deletable = entries.filter((e): e is Entry & { id: number } => e.id !== undefined);
      await fuelService.bulkDeleteEntries(deletable, user.supabaseId);

      setEntries(addedEntries);
      return addedEntries;
    } catch (error) {
      console.error('Error replacing entries:', error);
      throw error;
    }
  }, [entries, user?.id, user?.supabaseId]);

  // Handle email confirmation callback
  const handleNeedsConfirmation = (email: string) => {
    setConfirmationEmail(email);
  };

  const handleBackFromConfirmation = () => {
    setConfirmationEmail('');
    clearAwaitingConfirmation();
    setAuthMode('signin');
  };

  // Download entries as CSV
  function handleDownload() {
    if (entries.length === 0) {
      toast({ title: 'Nothing to export yet', description: 'Add a fill-up first.' });
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
        // Quote the station name to handle commas, and escape embedded quotes
        // per RFC 4180 (double them) so a station like `Bob's "Corner" Fuel` round-trips.
        `"${entry.fuelStation.replace(/"/g, '""')}"`,
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

  type ImportCandidate = Omit<Entry, 'id' | 'userId'>;

  // A row is only usable if every field parsed to something real — a NaN from a
  // malformed number or an unparseable date must never reach the database, since
  // every downstream average is computed from these fields.
  function isValidImportCandidate(entry: ImportCandidate): boolean {
    return (
      !!entry.date.trim() &&
      !Number.isNaN(Date.parse(entry.date.replace(/\//g, '-'))) &&
      Number.isFinite(entry.amountPaid) && entry.amountPaid > 0 &&
      Number.isFinite(entry.odometerReading) && entry.odometerReading >= 0 &&
      Number.isFinite(entry.fuelFilled) && entry.fuelFilled > 0 &&
      !!entry.fuelStation.trim()
    );
  }

  function parseCsvText(content: string): { entries: ImportCandidate[]; rejectedCount: number } {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { entries: [], rejectedCount: 0 };

    const hasHeader = lines[0].toLowerCase().includes('date') || lines[0].toLowerCase().includes('amount');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const candidates: ImportCandidate[] = dataLines.map(line => {
      // Handle quoted values, un-escaping doubled quotes (`""` -> `"`)
      const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v =>
        v.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
      ) || [];

      return {
        date: (values[0] || '').trim(),
        amountPaid: parseFloat(values[1] || ''),
        odometerReading: parseFloat(values[2] || ''),
        fuelFilled: parseFloat(values[3] || ''),
        fuelStation: (values[4] || '').trim(),
      };
    });

    const entries = candidates.filter(isValidImportCandidate);
    return { entries, rejectedCount: candidates.length - entries.length };
  }

  function describeImport(count: number, rejectedCount: number): string {
    const base = rejectedCount > 0
      ? `Found ${count} valid entries (${rejectedCount} row${rejectedCount === 1 ? '' : 's'} skipped — check the format).`
      : `Found ${count} entries.`;
    return `${base} This replaces everything currently saved — it can't be undone.`;
  }

  async function handleImportText() {
    if (!csvText.trim()) {
      toast({ title: 'Please enter CSV data', variant: 'destructive' });
      return;
    }

    try {
      const { entries: parsedEntries, rejectedCount } = parseCsvText(csvText);

      if (parsedEntries.length > 0) {
        setPendingImport({ entries: parsedEntries, rejectedCount });
      } else {
        toast({ title: 'No valid entries found in the CSV data', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({ title: 'Could not parse CSV data', description: 'Check the format and try again.', variant: 'destructive' });
    }
  }

  async function confirmPendingImport() {
    if (!pendingImport) return;

    try {
      const addedEntries = await replaceAllEntries(pendingImport.entries);
      toast({
        title: 'Data imported successfully',
        description: `${addedEntries?.length ?? pendingImport.entries.length} entries saved.`,
        variant: 'success',
      });
      setImportDialogOpen(false);
      setCsvText('');
    } catch (error) {
      console.error('Error importing entries:', error);
      toast({ title: 'Import failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setPendingImport(null);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        let parsedEntries: ImportCandidate[];
        let rejectedCount = 0;

        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(content) as Entry[];
          const candidates: ImportCandidate[] = jsonData.map((entry) => ({
            date: entry.date ?? '',
            amountPaid: entry.amountPaid,
            odometerReading: entry.odometerReading,
            fuelFilled: entry.fuelFilled,
            fuelStation: entry.fuelStation ?? '',
          }));
          parsedEntries = candidates.filter(isValidImportCandidate);
          rejectedCount = candidates.length - parsedEntries.length;
        } else if (file.name.endsWith('.csv')) {
          const result = parseCsvText(content);
          parsedEntries = result.entries;
          rejectedCount = result.rejectedCount;
        } else {
          toast({ title: 'Unsupported file format', description: 'Upload a CSV or JSON file.', variant: 'destructive' });
          return;
        }

        if (parsedEntries.length > 0) {
          setPendingImport({ entries: parsedEntries, rejectedCount });
        } else {
          toast({ title: 'No valid entries found in the file', variant: 'destructive' });
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        toast({ title: 'Could not parse the file', description: 'Check the format and try again.', variant: 'destructive' });
      }
    };

    reader.readAsText(file);
    // Reset input so the same file can be uploaded again
    event.target.value = '';
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show email confirmation screen
  if (confirmationEmail || authState.status === 'awaiting_confirmation') {
    const email = confirmationEmail || (authState.status === 'awaiting_confirmation' ? authState.email : '');
    return <EmailConfirmation email={email} onBack={handleBackFromConfirmation} />;
  }

  // Show authentication screens if user is not logged in
  if (!user) {
    return authMode === 'signin' ? (
      <SignIn 
        onSwitchToSignUp={() => setAuthMode('signup')} 
        onNeedsConfirmation={handleNeedsConfirmation}
      />
    ) : (
      <SignUp 
        onSwitchToSignIn={() => setAuthMode('signin')} 
        onNeedsConfirmation={handleNeedsConfirmation}
      />
    );
  }

  return (
    <div className='min-h-screen bg-background'>
      <header className='border-b border-border bg-background sticky top-0 z-50'>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary'>
                <HugeiconsIcon
                  icon={FuelStationIcon}
                  className='size-5 text-primary-foreground'
                  strokeWidth={2.5}
                />
              </div>
              <div>
                <h1 className='text-lg sm:text-2xl font-bold tracking-tight'>Combust</h1>
                <p className='hidden sm:block text-xs text-muted-foreground'>Fuel Tracking Made Simple</p>
              </div>
            </div>
            <div className='hidden sm:flex items-center gap-2'>
              <div className='text-sm text-muted-foreground mr-2'>
                {user.name}
              </div>
              <ThemeToggle />
              <Button
                variant='outline'
                size='sm'
                className='gap-2'
                onClick={handleUpload}
              >
                <HugeiconsIcon icon={Upload01Icon} className='size-4' />
                <span>Import</span>
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='gap-2'
                onClick={handleDownload}
              >
                <HugeiconsIcon icon={Download01Icon} className='size-4' />
                <span>Export</span>
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='gap-2'
                onClick={signOut}
                title="Sign Out"
              >
                <HugeiconsIcon icon={Logout01Icon} className='size-4' />
                <span>Sign Out</span>
              </Button>
            </div>
            <div className='sm:hidden'>
              <Popover open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <PopoverTrigger
                  render={
                    <Button variant='outline' size='icon' aria-label='Open menu'>
                      <HugeiconsIcon icon={Menu01Icon} className='size-5' />
                    </Button>
                  }
                />
                <PopoverContent align='end' className='w-56 p-2 gap-0'>
                  <div className='px-2 pb-2 mb-1 border-b text-sm text-muted-foreground'>
                    {user.name}
                  </div>
                  <div className='flex flex-col gap-1'>
                    <ThemeToggle menuItem />
                    <Button
                      variant='ghost'
                      className='justify-start gap-2 w-full'
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleUpload();
                      }}
                    >
                      <HugeiconsIcon icon={Upload01Icon} className='size-4' />
                      <span>Import</span>
                    </Button>
                    <Button
                      variant='ghost'
                      className='justify-start gap-2 w-full'
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleDownload();
                      }}
                    >
                      <HugeiconsIcon icon={Download01Icon} className='size-4' />
                      <span>Export</span>
                    </Button>
                    <Button
                      variant='ghost'
                      className='justify-start gap-2 w-full'
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut();
                      }}
                    >
                      <HugeiconsIcon icon={Logout01Icon} className='size-4' />
                      <span>Sign Out</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
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
      <AlertDialog open={pendingImport !== null} onOpenChange={(open) => { if (!open) setPendingImport(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace current data?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingImport && describeImport(pendingImport.entries.length, pendingImport.rejectedCount)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingImport(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingImport}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
              <TabsTrigger value='entries' className='text-base data-active:bg-primary data-active:text-primary-foreground dark:data-active:bg-primary dark:data-active:text-primary-foreground dark:data-active:border-transparent'>
                Entries
              </TabsTrigger>
              <TabsTrigger value='statistics' className='text-base data-active:bg-primary data-active:text-primary-foreground dark:data-active:bg-primary dark:data-active:text-primary-foreground dark:data-active:border-transparent'>
                Statistics
              </TabsTrigger>
            </TabsList>
            <TabsContent value='entries' className='space-y-6'>
              <Entries
                entries={entries}
                addEntry={addEntry}
                updateEntry={updateEntry}
                deleteEntry={deleteEntry}
                clearAllEntries={clearAllEntries}
              />
            </TabsContent>
            <TabsContent value='statistics' className='space-y-6'>
              <Suspense fallback={
                <div className='flex items-center justify-center min-h-100'>
                  <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
                </div>
              }>
                <Statistics entries={entries} />
              </Suspense>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default App;
