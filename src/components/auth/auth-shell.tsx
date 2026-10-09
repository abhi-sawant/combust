import { BrandMark } from '@/components/brand-mark'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthShellProps {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Renders just the form (no brand banner / full-page layout) for use inside a dialog. */
  embedded?: boolean
}

export function AuthShell({ title, description, children, footer, embedded }: AuthShellProps) {
  if (embedded) {
    return (
      <div className='flex flex-col gap-4'>
        <div>
          <h2 className='text-2xl font-bold'>{title}</h2>
          <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
        </div>
        {children}
        {footer && <div className='text-center text-sm text-muted-foreground'>{footer}</div>}
      </div>
    )
  }

  return (
    <div className='mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-4 p-4'>
      <div className='rounded-[32px] bg-field p-7'>
        <h1 className='flex items-center gap-2.5 font-display text-5xl leading-[0.9] font-extrabold tracking-tight'>
          <BrandMark className='size-10' />
          Combust
        </h1>
        <p className='mt-3 text-[15px] text-muted-foreground'>Fuel, mileage and cost for your bike.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-3xl'>{title}</CardTitle>
          <CardDescription className='text-sm text-muted-foreground'>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer && (
          <CardFooter className='justify-center bg-transparent text-sm text-muted-foreground'>{footer}</CardFooter>
        )}
      </Card>
    </div>
  )
}
