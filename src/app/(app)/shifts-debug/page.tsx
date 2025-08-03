import { redirect } from 'next/navigation';

export default function ShiftsDebugPage() {
  // Redirect to main shifts page - this debug version is no longer needed
  redirect('/shifts');
}