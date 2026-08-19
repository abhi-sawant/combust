import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthShellProps {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className='mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-8 bg-background p-4'>
      <div className='flex flex-col items-center gap-3'>
        <div className='flex size-12 items-center justify-center rounded-md'>
          <img src='/logo.svg' />
        </div>
        <h1 className='font-sans text-2xl font-bold text-foreground'>Combust</h1>
      </div>

      <Card className='shadow-card'>
        <CardHeader>
          <CardTitle className='font-sans text-xl font-bold'>{title}</CardTitle>
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
