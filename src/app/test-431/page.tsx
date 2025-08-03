import { redirect } from 'next/navigation';

export default function Test431Page() {
  // Redirect to dashboard - this test page is no longer needed
  redirect('/dashboard');
}
