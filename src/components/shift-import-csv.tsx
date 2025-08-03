'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileText, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Download,
  Eye,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ROLE_DEFINITIONS } from '@/lib/constants';
import type { RoleCode } from '@/lib/types';

interface ImportedWorker {
  userId: string;
  userName?: string;
  roleCode: RoleCode;
  clockInTime?: string;
  clockOutTime?: string;
  entryNumber?: number;
}

interface ShiftImportCSVProps {
  shiftId: string;
  onImportComplete?: (result: any) => void;
  className?: string;
}

export default function ShiftImportCSV({
  shiftId,
  onImportComplete,
  className = ''
}: ShiftImportCSVProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [importData, setImportData] = useState<ImportedWorker[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select a CSV file.',
        variant: 'destructive'
      });
      return;
    }

    parseCSVFile(file);
  };

  // Parse CSV file
  const parseCSVFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const parsedData = parseCSVContent(csvText);
        setImportData(parsedData);
        setShowPreview(true);
        
        toast({
          title: 'CSV Parsed Successfully',
          description: `Found ${parsedData.length} worker records.`
        });
      } catch (error) {
        toast({
          title: 'Parse Error',
          description: error instanceof Error ? error.message : 'Failed to parse CSV file.',
          variant: 'destructive'
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      toast({
        title: 'File Read Error',
        description: 'Failed to read the CSV file.',
        variant: 'destructive'
      });
    };

    reader.readAsText(file);
  };

  // Parse CSV content
  const parseCSVContent = (csvText: string): ImportedWorker[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row.');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const workers: ImportedWorker[] = [];

    // Expected headers (flexible order)
    const requiredHeaders = ['userid', 'rolecode'];
    const optionalHeaders = ['username', 'clockintime', 'clockouttime', 'entrynumber'];

    // Validate required headers
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1}: Column count mismatch, skipping`);
        continue;
      }

      const worker: ImportedWorker = {
        userId: '',
        roleCode: 'SH' // Default role
      };

      // Map values to worker object
      headers.forEach((header, index) => {
        const value = values[index];
        
        switch (header) {
          case 'userid':
            worker.userId = value;
            break;
          case 'username':
            worker.userName = value;
            break;
          case 'rolecode':
            if (Object.keys(ROLE_DEFINITIONS).includes(value.toUpperCase())) {
              worker.roleCode = value.toUpperCase() as RoleCode;
            } else {
              throw new Error(`Row ${i + 1}: Invalid role code '${value}'. Must be one of: ${Object.keys(ROLE_DEFINITIONS).join(', ')}`);
            }
            break;
          case 'clockintime':
            if (value && value !== '') {
              worker.clockInTime = value;
            }
            break;
          case 'clockouttime':
            if (value && value !== '') {
              worker.clockOutTime = value;
            }
            break;
          case 'entrynumber':
            if (value && value !== '') {
              const entryNum = parseInt(value);
              if (!isNaN(entryNum) && entryNum > 0) {
                worker.entryNumber = entryNum;
              }
            }
            break;
        }
      });

      // Validate required fields
      if (!worker.userId) {
        throw new Error(`Row ${i + 1}: userId is required`);
      }

      workers.push(worker);
    }

    return workers;
  };

  // Get worker counts by role
  const getWorkerCounts = () => {
    const counts: Record<RoleCode, number> = {
      'CC': 0, 'SH': 0, 'FO': 0, 'RFO': 0, 'RG': 0, 'GL': 0
    };

    importData.forEach(worker => {
      counts[worker.roleCode]++;
    });

    // Ensure crew chief is always 1 if any crew chiefs are found
    if (counts['CC'] > 0) {
      counts['CC'] = 1;
    }

    return counts;
  };

  // Execute import
  const executeImport = async () => {
    if (importData.length === 0) {
      toast({
        title: 'No Data',
        description: 'No worker data to import.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(`/api/shifts/${shiftId}/sync-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workers: importData,
          overwriteExisting: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();
      setImportResult(result.data);
      
      toast({
        title: 'Import Successful',
        description: `Successfully imported ${result.data.workersProcessed} workers and updated requirements.`
      });

      onImportComplete?.(result.data);

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import worker data.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset import
  const resetImport = () => {
    setImportData([]);
    setShowPreview(false);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const headers = ['userId', 'userName', 'roleCode', 'clockInTime', 'clockOutTime', 'entryNumber'];
    const sampleData = [
      ['user123', 'John Doe', 'CC', '2024-01-15T08:00:00Z', '2024-01-15T17:00:00Z', '1'],
      ['user456', 'Jane Smith', 'SH', '2024-01-15T08:30:00Z', '2024-01-15T16:30:00Z', '1'],
      ['user789', 'Bob Johnson', 'FO', '2024-01-15T09:00:00Z', '', '1']
    ];

    const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shift-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const workerCounts = getWorkerCounts();
  const hasCrewChief = workerCounts['CC'] > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Shift Workers from CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <FileText className="h-4 w-4 mr-2" />
              Select CSV File
            </Button>
            
            <Button
              variant="ghost"
              onClick={downloadTemplate}
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>

            {importData.length > 0 && (
              <Button
                variant="ghost"
                onClick={resetImport}
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              CSV file should contain columns: userId, roleCode (required), userName, clockInTime, clockOutTime, entryNumber (optional).
              Role codes: {Object.keys(ROLE_DEFINITIONS).join(', ')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {showPreview && importData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Import Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Worker Requirements Summary */}
            <div>
              <h4 className="font-medium mb-2">Worker Requirements (Auto-Generated)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {Object.entries(workerCounts).map(([roleCode, count]) => (
                  <div key={roleCode} className="text-center">
                    <Badge 
                      variant={count > 0 ? "default" : "outline"}
                      className={count > 0 ? ROLE_DEFINITIONS[roleCode as RoleCode].badgeClasses : ''}
                    >
                      {ROLE_DEFINITIONS[roleCode as RoleCode].name}
                    </Badge>
                    <div className="text-lg font-bold mt-1">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Validation Warnings */}
            {!hasCrewChief && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> No crew chief found in import data. You'll need to assign a crew chief manually after import.
                </AlertDescription>
              </Alert>
            )}

            {/* Worker List Preview */}
            <div>
              <h4 className="font-medium mb-2">Workers to Import ({importData.length})</h4>
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left p-2">User ID</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-left p-2">Clock In</th>
                      <th className="text-left p-2">Clock Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.slice(0, 10).map((worker, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2 font-mono text-xs">{worker.userId}</td>
                        <td className="p-2">{worker.userName || '-'}</td>
                        <td className="p-2">
                          <Badge variant="outline" className={ROLE_DEFINITIONS[worker.roleCode].badgeClasses}>
                            {worker.roleCode}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs">{worker.clockInTime || '-'}</td>
                        <td className="p-2 text-xs">{worker.clockOutTime || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importData.length > 10 && (
                  <div className="p-2 text-center text-sm text-gray-500 border-t">
                    ... and {importData.length - 10} more workers
                  </div>
                )}
              </div>
            </div>

            {/* Import Button */}
            <div className="flex justify-end">
              <Button
                onClick={executeImport}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Import Workers & Sync Requirements
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Import Completed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{importResult.workersProcessed}</div>
                <div className="text-sm text-gray-600">Workers Processed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{importResult.assignedPersonnelCreated}</div>
                <div className="text-sm text-gray-600">Personnel Assigned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{importResult.timeEntriesCreated}</div>
                <div className="text-sm text-gray-600">Time Entries Created</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{Object.keys(importResult.workerRequirements).length}</div>
                <div className="text-sm text-gray-600">Requirements Updated</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
