'use client';

import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-red-600">Unauthorized</h1>
      <p className="mt-4 text-lg text-gray-700">You do not have permission to view this page.</p>
      <Link href="/dashboard" className="mt-8 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
        Go to Dashboard
      </Link>
    </div>
  );
}
