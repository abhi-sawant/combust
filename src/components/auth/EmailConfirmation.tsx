import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';

type EmailConfirmationProps = {
  email: string;
  onBack: () => void;
};

export function EmailConfirmation({ email, onBack }: EmailConfirmationProps) {
  const { resendConfirmationEmail } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResend = async () => {
    setIsResending(true);
    setMessage(null);

    const { error } = await resendConfirmationEmail(email);

    if (error) {
      setMessage({ type: 'error', text: error });
    } else {
      setMessage({ type: 'success', text: 'Confirmation email sent! Please check your inbox.' });
    }

    setIsResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
              <HugeiconsIcon
                icon={Mail01Icon}
                className="size-8 text-primary-foreground"
                strokeWidth={2.5}
              />
            </div>
          </div>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription className="text-base">
            We've sent a confirmation link to{' '}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>Please click the confirmation link in your email to activate your account.</p>
            <p className="mt-2">Once confirmed, you can sign in to start tracking your fuel consumption.</p>
          </div>

          {message && (
            <div className={`text-sm p-3 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                : 'bg-destructive/10 text-destructive'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? 'Sending...' : 'Resend Confirmation Email'}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={onBack}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4 mr-2" />
              Back to Sign In
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
