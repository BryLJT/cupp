// Supabase auth-js error messages are technical and inconsistent in tone.
// Map the ones users can actually hit to copy that tells them what to do next.

const MESSAGE_MAP: Array<[RegExp, string]> = [
  [/user already registered/i, 'An account with that email already exists — try signing in instead.'],
  [/invalid login credentials/i, 'Incorrect email or password.'],
  [/email not confirmed/i, 'Check your email to confirm your account before signing in.'],
  [/password should be at least/i, 'Password must be at least 6 characters.'],
  [/unable to validate email address/i, "That doesn't look like a valid email address."],
  [/network request failed/i, "Couldn't reach the server — check your connection and try again."],
  [/no session was returned/i, 'Account created! Check your email to confirm it, then sign in.'],
  [/rate limit/i, "Too many attempts right now — wait a bit and try again."],
];

export function friendlyAuthError(message: string): string {
  const match = MESSAGE_MAP.find(([re]) => re.test(message));
  return match ? match[1] : 'Something went wrong. Please try again.';
}
