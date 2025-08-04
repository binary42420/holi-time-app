'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AvatarApiTest() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testAvatarEndpoints = async () => {
    setLoading(true);
    setTestResults([]);
    
    const testUsers = [
      { id: 'cmdtftrs70007kz8x7q3kt4km', name: 'Ryley Holmes' },
      { id: 'cmdw7yuyi0006avzm6sbkv172', name: 'Aaron Mosher' },
      { id: 'cmdw7yv4u0008avzmqoqk9v5v', name: 'Caleb Robinson' }
    ];

    const results = [];

    for (const user of testUsers) {
      try {
        // Test avatar image endpoint
        const avatarResponse = await fetch(`/api/users/${user.id}/avatar/image`);
        
        const result = {
          userId: user.id,
          userName: user.name,
          avatarStatus: avatarResponse.status,
          avatarHeaders: Object.fromEntries(avatarResponse.headers.entries()),
          avatarContentType: avatarResponse.headers.get('content-type'),
          avatarSize: avatarResponse.headers.get('content-length'),
          avatarSource: avatarResponse.headers.get('x-avatar-source'),
          success: avatarResponse.ok
        };

        if (avatarResponse.ok) {
          const blob = await avatarResponse.blob();
          result.actualSize = blob.size;
          result.blobType = blob.type;
        }

        results.push(result);
      } catch (error) {
        results.push({
          userId: user.id,
          userName: user.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Avatar API Test</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Avatar Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testAvatarEndpoints} disabled={loading}>
              {loading ? 'Testing...' : 'Test Avatar APIs'}
            </Button>
          </CardContent>
        </Card>

        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">
                      {result.userName} ({result.userId})
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Status:</strong> {result.success ? '✅ Success' : '❌ Failed'}</p>
                        <p><strong>HTTP Status:</strong> {result.avatarStatus}</p>
                        <p><strong>Content-Type:</strong> {result.avatarContentType || 'N/A'}</p>
                        <p><strong>Avatar Source:</strong> {result.avatarSource || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <p><strong>Content-Length:</strong> {result.avatarSize || 'N/A'}</p>
                        <p><strong>Actual Size:</strong> {result.actualSize || 'N/A'} bytes</p>
                        <p><strong>Blob Type:</strong> {result.blobType || 'N/A'}</p>
                        {result.error && <p><strong>Error:</strong> {result.error}</p>}
                      </div>
                    </div>

                    {result.success && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Avatar Preview:</p>
                        <img 
                          src={`/api/users/${result.userId}/avatar/image?t=${Date.now()}`}
                          alt={result.userName}
                          className="w-16 h-16 rounded-full object-cover bg-gray-200"
                          onError={(e) => {
                            console.error(`Preview failed for ${result.userName}`);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}