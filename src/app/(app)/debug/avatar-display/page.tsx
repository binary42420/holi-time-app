'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar } from '@/components/Avatar';
import { SimpleAvatar } from '@/components/SimpleAvatar';

interface User {
  id: string;
  name: string;
  email: string;
  avatarData?: string;
  avatarUrl?: string;
}

export default function AvatarDisplayTest() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/employees?limit=10');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Fetched users:', data.users);
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const testDirectAvatarUrl = async (userId: string) => {
    try {
      const url = `/api/users/${userId}/avatar/image`;
      console.log(`Testing direct avatar URL: ${url}`);
      
      // Test with HEAD request first
      const headResponse = await fetch(url, { method: 'HEAD' });
      console.log(`HEAD response for ${userId}:`, {
        status: headResponse.status,
        headers: Object.fromEntries(headResponse.headers.entries())
      });

      // Test with GET request
      const getResponse = await fetch(url);
      console.log(`GET response for ${userId}:`, {
        status: getResponse.status,
        contentType: getResponse.headers.get('content-type'),
        contentLength: getResponse.headers.get('content-length'),
        cacheControl: getResponse.headers.get('cache-control'),
        avatarSource: getResponse.headers.get('x-avatar-source')
      });

      if (getResponse.ok) {
        const blob = await getResponse.blob();
        console.log(`Avatar blob for ${userId}:`, {
          size: blob.size,
          type: blob.type
        });
      }
    } catch (err) {
      console.error(`Error testing avatar for ${userId}:`, err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Avatar Display Test</h1>
      
      <div className="grid gap-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchUsers} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh Users'}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Users Display */}
        <Card>
          <CardHeader>
            <CardTitle>Users with Avatar Tests ({users.length} users)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {users.map((user) => (
                <div key={user.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-medium">Avatar Component</span>
                      <Avatar 
                        name={user.name} 
                        userId={user.id} 
                        size="lg" 
                        enableSmartCaching={false}
                      />
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-medium">SimpleAvatar Component</span>
                      <SimpleAvatar 
                        src={`/api/users/${user.id}/avatar/image?t=${Date.now()}`}
                        name={user.name} 
                        size="lg"
                      />
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-medium">Direct Image</span>
                      <img 
                        src={`/api/users/${user.id}/avatar/image?t=${Date.now()}`}
                        alt={user.name}
                        className="w-20 h-20 rounded-full object-cover bg-gray-200"
                        onError={(e) => {
                          console.error(`Direct image failed for ${user.name}:`, e);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log(`Direct image loaded for ${user.name}`);
                        }}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500">ID: {user.id}</p>
                      <p className="text-xs text-gray-500">
                        Avatar URL: {user.avatarUrl || 'null'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Has Avatar Data: {user.avatarData ? 'Yes' : 'No'}
                      </p>
                      {user.avatarData && (
                        <p className="text-xs text-gray-500">
                          Avatar Data Type: {user.avatarData.startsWith('data:') ? 'Base64' : 'URL'}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testDirectAvatarUrl(user.id)}
                      >
                        Test Avatar API
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p><strong>Total Users:</strong> {users.length}</p>
              <p><strong>Users with avatarUrl:</strong> {users.filter(u => u.avatarUrl).length}</p>
              <p><strong>Users with avatarData:</strong> {users.filter(u => u.avatarData).length}</p>
              <p><strong>Check browser console for detailed avatar loading logs</strong></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}