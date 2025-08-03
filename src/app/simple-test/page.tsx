import { redirect } from 'next/navigation';

export default function SimpleTestPage() {
  // Redirect to dashboard - this test page is no longer needed
  redirect('/dashboard');
}
