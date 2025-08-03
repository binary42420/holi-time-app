"use client"

import { useState, useEffect } from "react"
import { Loader2, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Cloud } from "lucide-react"

import { Button } from '@/components/ui/button'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'

import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
}

interface ImportResults {
  clients: { created: number; updated: number; errors: number };
  jobs: { created: number; updated: number; errors: number };
  shifts: { created: number; updated: number; errors: number };
  assignments: { created: number; errors: number };
}

export default function ImportPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [importResults, setImportResults] = useState<ImportResults | null>(null)
  const [step, setStep] = useState<'auth' | 'select' | 'preview' | 'import' | 'complete'>('auth')
  const { toast } = useToast()

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/import/google-drive/files')
      if (response.ok) {
        setIsAuthenticated(true)
        setStep('select')
        await loadFiles()
      }
    } catch (error) {
      console.log('Not authenticated with Google Drive')
    }
  }

  const authenticateWithGoogle = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/import/google-drive/auth')
      const data = await response.json()

      if (data.success) {
        if (typeof window !== 'undefined') {
          window.location.href = data.authUrl
        }
      } else {
        throw new Error('Failed to get auth URL')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to authenticate with Google Drive",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadFiles = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/import/google-drive/files')
      const data = await response.json()

      if (data.success) {
        setFiles(data.files)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load files from Google Drive",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const extractData = async (file: DriveFile) => {
    try {
      setIsLoading(true)
      setSelectedFile(file)

      const response = await fetch('/api/import/google-drive/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id }),
      })

      const data = await response.json()

      if (data.success) {
        setExtractedData(data.data)
        setStep('preview')
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to extract data from file",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const importData = async () => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/import/google-drive/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData }),
      })

      const data = await response.json()

      if (data.success) {
        setImportResults(data.results)
        setStep('complete')
        toast({
          title: "Success",
          description: "Data imported successfully!",
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return 'Unknown size'
    const size = parseInt(bytes)
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const getMimeTypeIcon = (mimeType: string) => {
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />
    }
    return <FileSpreadsheet className="h-8 w-8 text-blue-600" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Import</h1>
          <p className="text-muted-foreground">
            Import client and shift data from Google Sheets and Excel files
          </p>
        </div>
      </div>

      {/* Step 1: Authentication */}
      {step === 'auth' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-6 w-6" />
              Connect to Google Drive
            </CardTitle>
            <CardDescription>
              Authenticate with Google Drive to access your spreadsheet files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Cloud className="h-16 w-16 mx-auto mb-4 text-blue-600" />
              <p className="text-muted-foreground mb-6">
                Connect your Google Drive account to import client and shift data from spreadsheets
              </p>
              <Button onClick={authenticateWithGoogle} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Cloud className="mr-2 h-4 w-4" />
                Connect Google Drive
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: File Selection */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Spreadsheet File</CardTitle>
            <CardDescription>
              Choose a Google Sheets or Excel file to import data from
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading files...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8">
                <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No spreadsheet files found in your Google Drive</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => extractData(file)}
                  >
                    <div className="flex items-center gap-3">
                      {getMimeTypeIcon(file.mimeType)}
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)} • Modified {new Date(file.modifiedTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Data Preview */}
      {step === 'preview' && extractedData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>
                Review the extracted data before importing to the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{extractedData.summary.totalClients}</p>
                    <p className="text-sm text-muted-foreground">Clients</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{extractedData.summary.totalShifts}</p>
                    <p className="text-sm text-muted-foreground">Shifts</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{extractedData.sheets.length}</p>
                    <p className="text-sm text-muted-foreground">Sheets</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {extractedData.sheets.reduce((acc: number, sheet: any) =>
                        acc + (sheet.metadata?.confidence || 0), 0) / extractedData.sheets.length}%
                    </p>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                  </div>
                </div>

                {/* Sheet Details */}
                {extractedData.sheets.map((sheet: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Sheet: {sheet.metadata.sheetName}</h3>

                    {sheet.clients.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Clients ({sheet.clients.length})</h4>
                        <div className="space-y-2">
                          {sheet.clients.slice(0, 3).map((client: any, i: number) => (
                            <div key={i} className="text-sm p-2 bg-muted rounded">
                              <span className="font-medium">{client.name}</span>
                              {client.email && <span className="text-muted-foreground"> • {client.email}</span>}
                            </div>
                          ))}
                          {sheet.clients.length > 3 && (
                            <p className="text-sm text-muted-foreground">
                              +{sheet.clients.length - 3} more clients...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {sheet.shifts.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Shifts ({sheet.shifts.length})</h4>
                        <div className="space-y-2">
                          {sheet.shifts.slice(0, 3).map((shift: any, i: number) => (
                            <div key={i} className="text-sm p-2 bg-muted rounded">
                              <span className="font-medium">{shift.jobName}</span>
                              <span className="text-muted-foreground"> • {shift.clientName} • {shift.date}</span>
                            </div>
                          ))}
                          {sheet.shifts.length > 3 && (
                            <p className="text-sm text-muted-foreground">
                              +{sheet.shifts.length - 3} more shifts...
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('select')}>
                Back to Files
              </Button>
              <Button onClick={importData} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import Data
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Step 4: Import Complete */}
      {step === 'complete' && importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Import Complete
            </CardTitle>
            <CardDescription>
              Data has been successfully imported to the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {importResults.clients.created + importResults.clients.updated}
                </p>
                <p className="text-sm text-muted-foreground">Clients</p>
                <p className="text-xs text-muted-foreground">
                  {importResults.clients.created} new, {importResults.clients.updated} updated
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {importResults.jobs.created + importResults.jobs.updated}
                </p>
                <p className="text-sm text-muted-foreground">Jobs</p>
                <p className="text-xs text-muted-foreground">
                  {importResults.jobs.created} new, {importResults.jobs.updated} updated
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{importResults.shifts.created}</p>
                <p className="text-sm text-muted-foreground">Shifts</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{importResults.assignments.created}</p>
                <p className="text-sm text-muted-foreground">Assignments</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
            </div>

            {(importResults.clients.errors > 0 ||
              importResults.jobs.errors > 0 ||
              importResults.shifts.errors > 0 ||
              importResults.assignments.errors > 0) && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some items had errors during import. Check the logs for details.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={() => {
              setStep('select')
              setExtractedData(null)
              setImportResults(null)
              setSelectedFile(null)
            }}>
              Import Another File
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
