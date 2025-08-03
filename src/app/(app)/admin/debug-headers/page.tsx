import { redirect } from 'next/navigation';

export default function DebugHeadersPage() {
  // Redirect to admin dashboard - this debug page is no longer needed
  redirect('/admin');
}
