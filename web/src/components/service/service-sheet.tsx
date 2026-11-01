import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ServiceForm } from '@/components/service/service-form'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useServices } from '@/hooks/services-context'
import type { ServiceItem } from '@/types/service'

interface ServiceSheetProps {
  item?: ServiceItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Add/edit sheet shared by the "add item" action and each item's edit action. */
export function ServiceSheet({ item, open, onOpenChange }: ServiceSheetProps) {
  const { deleteService } = useServices()

  function handleSaved() {
    toast.success(item ? 'Item updated' : 'Item added')
    onOpenChange(false)
  }

  async function handleDelete() {
    if (!item) return
    await deleteService(item.id)
    toast.success('Item deleted')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='bottom' className='max-h-[92svh] overflow-y-auto'>
        <SheetHeader>
          <SheetTitle className='font-sans text-xl font-bold'>{item ? `Edit ${item.name}` : 'Add service item'}</SheetTitle>
          <SheetDescription>
            Record when this was last changed and how often it should be, so Combust can remind you.
          </SheetDescription>
        </SheetHeader>
        <div className='flex flex-col gap-4 px-4 pb-6'>
          <ServiceForm
            key={item?.id ?? 'new'}
            item={item}
            onSaved={handleSaved}
            onCancel={() => onOpenChange(false)}
          />
          {item && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant='outline'
                    className='w-full text-destructive hover:bg-warning-band hover:text-warning-band-foreground'
                  />
                }>
                <Trash2 />
                Delete this item
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the item and its last-changed record. This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant='destructive' onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
