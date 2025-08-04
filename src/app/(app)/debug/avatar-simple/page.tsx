'use client';

import React from 'react';
import { Avatar } from '@/components/Avatar';

export default function SimpleAvatarTest() {
  const testUserId = 'cmdtftrs70007kz8x7q3kt4km'; // Ryley Holmes
  const testUserName = 'Ryley Holmes';

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Simple Avatar Test</h1>
      
      <div className="grid gap-6">
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Avatar Component Test</h2>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium">With userId only</span>
              <Avatar 
                name={testUserName} 
                userId={testUserId} 
                size="lg" 
                enableSmartCaching={true}
              />
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium">With src only</span>
              <Avatar 
                src={`/api/users/${testUserId}/avatar/image`}
                name={testUserName} 
                size="lg" 
              />
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium">Direct img tag</span>
              <img 
                src={`/api/users/${testUserId}/avatar/image?t=${Date.now()}`}
                alt={testUserName}
                className="w-20 h-20 rounded-full object-cover bg-gray-200"
                onError={(e) => {
                  console.error('Direct image failed:', e);
                }}
                onLoad={() => {
                  console.log('Direct image loaded successfully');
                }}
              />
            </div>
          </div>
          
          <div className="text-sm space-y-2">
            <p><strong>Test User ID:</strong> {testUserId}</p>
            <p><strong>Test User Name:</strong> {testUserName}</p>
            <p><strong>Avatar URL:</strong> /api/users/{testUserId}/avatar/image</p>
            <p><strong>Check browser console for any errors</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}