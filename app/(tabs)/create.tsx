import { Redirect } from 'expo-router';

// The Create tab opens the log form as a modal (handled in the custom tab bar).
// This route exists so the tab is registered; if reached directly (deep link),
// it forwards to the blank log form.
export default function CreateTab() {
  return <Redirect href="/log/new" />;
}
