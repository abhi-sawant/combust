import { BrandMark } from '@/components/brand-mark'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthShellProps {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
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
