"use client";

import Image from 'next/image';
import React, { useState, useEffect } from "react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
}

interface GoogleDrivePickerProps {
  accessToken: string;
  onFileSelect: (file: DriveFile) => void;
}

export default function GoogleDrivePicker({ accessToken, onFileSelect }: GoogleDrivePickerProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    fetch("/api/import/google-drive/files", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${res.status}: Failed to fetch files`);
        }
        return res.json();
      })
      .then((data) => {
        console.log('Google Drive Picker: Received files:', data.files?.length || 0);
        setFiles(data.files || []);
      })
      .catch((err) => {
        console.error('Google Drive Picker: Error fetching files:', err);
        setError(err.message || 'Failed to fetch Google Drive files');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accessToken]);

  if (loading) return <div>Loading files...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div>
      <h3 className="mb-2 font-semibold">Select a Google Sheets file to import</h3>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {files.map((file) => (
          <li key={file.id} className="flex items-center space-x-4 p-2 border rounded hover:bg-gray-100 cursor-pointer" onClick={() => onFileSelect(file)}>
            {file.thumbnailLink ? (
              <div className="relative w-8 h-8">
                <Image
                  src={file.thumbnailLink}
                  alt={file.name}
                  fill
                  sizes="32px"
                  className="object-cover rounded"
                />
              </div>
            ) : (
              <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center text-sm font-bold text-gray-600">S</div>
            )}
            <div>
              <div className="font-medium">{file.name}</div>
              <div className="text-xs text-gray-500">{new Date(file.modifiedTime).toLocaleString()}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
