import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function EmailConfirmationScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { resendConfirmationEmail } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setMessage('');
    try {
      const result = await resendConfirmationEmail(email);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage('Confirmation email resent! Please check your inbox.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={48} color="#7f22fe" />
        </View>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a confirmation link to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>
        <Text style={styles.instruction}>
          Click the link in the email to confirm your account, then come back and sign in.
        </Text>

        {message ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.resendButton, isResending && styles.disabledButton]}
          onPress={handleResend}
          disabled={isResending}
        >
          {isResending ? (
            <ActivityIndicator color="#7f22fe" size="small" />
          ) : (
            <Text style={styles.resendButtonText}>Resend Confirmation Email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signInLink}
          onPress={() => router.replace('/(auth)/sign-in')}
        >
          <Text style={styles.signInLinkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  email: {
    color: '#7f22fe',
    fontWeight: '600',
  },
  instruction: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  messageBox: {
    width: '100%',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  messageText: {
    color: '#7f22fe',
    fontSize: 13,
    textAlign: 'center',
  },
  resendButton: {
    width: '100%',
    height: 44,
    borderWidth: 1.5,
    borderColor: '#7f22fe',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  resendButtonText: {
    color: '#7f22fe',
    fontSize: 15,
    fontWeight: '600',
  },
  signInLink: {
    paddingVertical: 8,
  },
  signInLinkText: {
    color: '#6b7280',
    fontSize: 14,
  },
});
