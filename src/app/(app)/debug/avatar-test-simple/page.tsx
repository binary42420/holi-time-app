'use client';

import React from 'react';
import { Avatar } from '@/components/Avatar';

export default function AvatarTestSimple() {
  // Test with a known user ID
  const testUserId = 'cmdw7yuyi0006avzm6sbkv172'; // Aaron Mosher
  const testUserName = 'Aaron Mosher';

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Simple Avatar Test</h1>
      
      <div className="space-y-8">
        {/* Test 1: Basic Avatar with userId */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Test 1: Basic Avatar (userId only)</h2>
          <div className="flex items-center gap-4">
            <Avatar 
              userId={testUserId}
              name={testUserName}
              size="lg"
            />
            <div>
              <p><strong>User:</strong> {testUserName}</p>
              <p><strong>User ID:</strong> {testUserId}</p>
              <p><strong>Smart Caching:</strong> Enabled (default)</p>
            </div>
          </div>
        </div>

        {/* Test 2: Avatar without smart caching */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Test 2: Avatar without Smart Caching</h2>
          <div className="flex items-center gap-4">
            <Avatar 
              userId={testUserId}
              name={testUserName}
              size="lg"
              enableSmartCaching={false}
            />
            <div>
              <p><strong>User:</strong> {testUserName}</p>
              <p><strong>User ID:</strong> {testUserId}</p>
              <p><strong>Smart Caching:</strong> Disabled</p>
            </div>
          </div>
        </div>

        {/* Test 3: Multiple sizes */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Test 3: Multiple Sizes</h2>
          <div className="flex items-center gap-4">
            <Avatar userId={testUserId} name={testUserName} size="xs" />
            <Avatar userId={testUserId} name={testUserName} size="sm" />
            <Avatar userId={testUserId} name={testUserName} size="md" />
            <Avatar userId={testUserId} name={testUserName} size="lg" />
            <Avatar userId={testUserId} name={testUserName} size="xl" />
          </div>
          <p className="mt-2 text-sm text-gray-600">Sizes: xs, sm, md, lg, xl</p>
        </div>

        {/* Test 4: Fallback to initials */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Test 4: Fallback to Initials (no userId)</h2>
          <div className="flex items-center gap-4">
            <Avatar 
              name="John Doe"
              size="lg"
            />
            <div>
              <p><strong>Name:</strong> John Doe</p>
              <p><strong>User ID:</strong> None (should show initials)</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Open browser developer tools and check the Console tab</li>
            <li>Look for avatar loading logs - they should appear once per avatar, not repeatedly</li>
            <li>Check the Network tab to ensure avatar images are not being fetched repeatedly</li>
            <li>Verify that avatars load and display correctly</li>
            <li>If you see repeated console logs or network requests, there's still an infinite loop</li>
          </ol>
        </div>
      </div>
    </div>
  );
}