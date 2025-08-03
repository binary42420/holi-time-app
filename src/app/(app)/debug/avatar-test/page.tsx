'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react";

export default function AvatarTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const testUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/debug/avatar-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsUploading(false);
    }
  };

  const checkSystemStatus = async () => {
    try {
      const response = await fetch('/api/debug/avatar-upload');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check system status');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Avatar Upload Debug Tool</h1>
      
      <div className="grid gap-6">
        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={checkSystemStatus} variant="outline">
              Check System Status
            </Button>
          </CardContent>
        </Card>

        {/* File Upload Test */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>
            
            {file && (
              <div className="text-sm text-muted-foreground">
                <p><strong>File:</strong> {file.name}</p>
                <p><strong>Size:</strong> {Math.round(file.size / 1024)}KB</p>
                <p><strong>Type:</strong> {file.type}</p>
              </div>
            )}
            
            <Button 
              onClick={testUpload} 
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Upload...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Test Upload
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Result */}
        {result && !error && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Success!</strong> {result.message || 'Test completed'}
            </AlertDescription>
          </Alert>
        )}

        {/* Detailed Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>1. Check System Status:</strong> Verify that Sharp is available and system limits are correct.</p>
            <p><strong>2. Test Upload:</strong> Select an image file and test the upload processing.</p>
            <p><strong>3. Review Results:</strong> Check the detailed output to identify any issues.</p>
            <p><strong>Common Issues:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Image too large (over 5MB original or 1MB processed)</li>
              <li>Unsupported format (use JPEG, PNG, GIF, or WebP)</li>
              <li>Sharp library not available (affects compression)</li>
              <li>Database connection issues</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
