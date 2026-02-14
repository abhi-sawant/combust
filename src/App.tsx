import { HugeiconsIcon } from '@hugeicons/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import {
  Download01Icon,
  FuelStationIcon,
  Upload01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from './components/ui/button';
import { Entries } from './components/entries';

export function App() {
  return (
    <>
      <header className='flex p-2 border border-b justify-between sticky top-0 bg-background items-center gap-2'>
        <div className='flex items-center gap-2'>
          <HugeiconsIcon
            icon={FuelStationIcon}
            className='w-6 h-6 size-6 text-primary'
          />
          <h1 className='text-2xl font-bold'>Combust</h1>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='icon'
            aria-label='Upload data. CSV format.'
          >
            <HugeiconsIcon icon={Upload01Icon} />
          </Button>
          <Button
            variant='outline'
            size='icon'
            aria-label='Download data. CSV format.'
          >
            <HugeiconsIcon icon={Download01Icon} />
          </Button>
        </div>
      </header>
      <main>
        <Tabs defaultValue='entries' className='mt-2'>
          <TabsList className='mx-auto'>
            <TabsTrigger value='entries'>Entries</TabsTrigger>
            <TabsTrigger value='statistics'>Statistics</TabsTrigger>
          </TabsList>
          <TabsContent
            value='entries'
            className='px-2 max-h-[calc(100vh-106px)] overflow-y-auto'
          >
            <Entries />
          </TabsContent>
          <TabsContent
            value='statistics'
            className='px-2 max-h-[calc(100vh-106px)] overflow-y-auto'
          >
            Change your statistics here.
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

export default App;
