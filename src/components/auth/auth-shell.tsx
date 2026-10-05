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
      <div className='rounded-[22px] bg-lime p-6 text-lime-foreground'>
        <h1 className='font-display text-6xl leading-[0.85] font-black tracking-wider'>COMBUST</h1>
        <p className='mt-2 text-sm font-semibold'>Fuel, mileage and cost for your bike.</p>
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
