import type { NamespaceDictionary } from '../../types';

const forgotPassword = {
  title: 'Reset your password',
  subtitle: "We'll email you a link to set a new password.",
  emailLabel: 'Email address',
  emailPlaceholder: 'you@example.com',
  submitButton: 'Send reset link',
  successMessage: 'Check your inbox for a password reset link.',
  backToSignIn: 'Back to sign in',
} satisfies NamespaceDictionary;

export default forgotPassword;
