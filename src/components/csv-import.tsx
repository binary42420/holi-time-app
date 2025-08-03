'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Upload, Download, FileText, AlertCircle, CheckCircle, Eye } from 'lucide-react'
import { CSVRow } from '@/app/api/import/csv/parse/route'
import { CSVDataPreview } from './csv-data-preview'

interface ParsedCSVData {
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    headers: string[]
  }
  data: CSVRow[]
  validData: CSVRow[]
  errors: Array<{
    rowNumber: number
    errors: string[]
    data: CSVRow
  }>
}

interface ImportSummary {
  clients: { created: number; updated: number }
  jobs: { created: number; updated: number }
  shifts: { created: number; updated: number }
  users: { created: number; updated: number }
  assignments: { created: number; updated: number }
  timeEntries: { created: number; updated: number }
  errors: Array<{ rowNumber: number; error: string }>
}

interface CSVImportProps {
  externalCSVData?: string | null
}

export default function CSVImport({ externalCSVData }: CSVImportProps) {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null)
  const [editedData, setEditedData] = useState<CSVRow[]>([])
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'complete'>('upload')

  // Handle external CSV data from Gemini
  React.useEffect(() => {
    if (externalCSVData && !parsedData) {
      processExternalCSV(externalCSVData)
    }
  }, [externalCSVData, parsedData])

  const processExternalCSV = async (csvData: string) => {
    try {
      // Create a File object from the CSV string
      const blob = new Blob([csvData], { type: 'text/csv' })
      const file = new File([blob], 'gemini-generated.csv', { type: 'text/csv' })

      // Process it through the same parsing logic
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import/csv/parse', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to parse CSV')
      }

      setParsedData(result)
      setEditedData(result.data)
      setCurrentStep('preview')

      toast({
        title: 'Gemini CSV Loaded',
        description: `Processed ${result.summary.totalRows} rows from Gemini AI`
      })

    } catch (error) {
      toast({
        title: 'Failed to Load Gemini CSV',
        description: error instanceof Error ? error.message : 'Failed to process generated CSV',
        variant: 'destructive'
      })
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setParsedData(null)
      setEditedData([])
      setImportSummary(null)
      setCurrentStep('upload')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import/csv/parse', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to parse CSV')
      }

      setParsedData(result)
      setEditedData(result.data)
      setCurrentStep('preview')

      toast({
        title: 'CSV Parsed Successfully',
        description: `Found ${result.summary.totalRows} rows (${result.summary.validRows} valid, ${result.summary.invalidRows} with errors)`
      })

    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to parse CSV file',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleImport = async () => {
    if (!editedData.length) return

    setIsImporting(true)
    try {
      // Only import valid rows
      const validRows = editedData.filter(row => !row._errors || row._errors.length === 0)

      const response = await fetch('/api/import/csv/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: validRows })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import data')
      }

      setImportSummary(result.summary)
      setCurrentStep('complete')

      toast({
        title: 'Import Completed',
        description: `Successfully imported ${validRows.length} rows`
      })

    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import data',
        variant: 'destructive'
      })
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/import/csv/template')
      if (!response.ok) throw new Error('Failed to download template')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'holitime_import_template.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Template Downloaded',
        description: 'CSV template has been downloaded to your computer'
      })
    } catch {
      toast({
        title: 'Download Failed',
        description: 'Failed to download CSV template',
        variant: 'destructive'
      })
    }
  }

  const downloadErrorReport = () => {
    if (!parsedData?.errors.length) return

    const errorReport = parsedData.errors.map(error => ({
      'Row Number': error.rowNumber,
      'Errors': error.errors.join('; '),
      'Client Name': error.data.client_name,
      'Job Name': error.data.job_name,
      'Employee Name': error.data.employee_name
    }))

    const csv = [
      Object.keys(errorReport[0]).join(','),
      ...errorReport.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import_errors.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const resetImport = () => {
    setFile(null)
    setParsedData(null)
    setEditedData([])
    setImportSummary(null)
    setCurrentStep('upload')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CSV Import</h2>
          <p className="text-muted-foreground">
            Import clients, jobs, shifts, employees, and time entries from a CSV file
          </p>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* Gemini Data Available Notice */}
      {externalCSVData && currentStep === 'upload' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Gemini AI has generated CSV data from your Google Sheets. The data will be automatically loaded for preview.
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        <div className={`flex items-center space-x-2 ${currentStep === 'upload' ? 'text-primary' : currentStep === 'preview' || currentStep === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-primary text-primary-foreground' : currentStep === 'preview' || currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-muted'}`}>
            1
          </div>
          <span>Upload & Parse</span>
        </div>
        <div className="flex-1 h-px bg-muted" />
        <div className={`flex items-center space-x-2 ${currentStep === 'preview' ? 'text-primary' : currentStep === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'preview' ? 'bg-primary text-primary-foreground' : currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-muted'}`}>
            2
          </div>
          <span>Preview & Edit</span>
        </div>
        <div className="flex-1 h-px bg-muted" />
        <div className={`flex items-center space-x-2 ${currentStep === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-muted'}`}>
            3
          </div>
          <span>Complete</span>
        </div>
      </div>

      {/* Step 1: Upload */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
            <CardDescription>
              Select a CSV file to import. The file must contain the required headers and valid data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>

            {file && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Selected file: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? 'Parsing...' : 'Parse CSV'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview & Edit */}
      {currentStep === 'preview' && parsedData && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Import Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{parsedData.summary.validRows}</div>
                  <div className="text-sm text-muted-foreground">Valid Rows</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{parsedData.summary.invalidRows}</div>
                  <div className="text-sm text-muted-foreground">Invalid Rows</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{parsedData.summary.totalRows}</div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </div>
              </div>

              {parsedData.summary.invalidRows > 0 && (
                <div className="flex items-center justify-between">
                  <Alert className="flex-1 mr-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {parsedData.summary.invalidRows} rows have validation errors. Fix errors or they will be skipped during import.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={downloadErrorReport} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download Errors
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Preview */}
          <CSVDataPreview 
            data={editedData}
            onDataChange={setEditedData}
          />

          {/* Actions */}
          <div className="flex justify-between">
            <Button onClick={resetImport} variant="outline">
              Start Over
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={isImporting || editedData.filter(row => !row._errors || row._errors.length === 0).length === 0}
            >
              {isImporting ? 'Importing...' : `Import ${editedData.filter(row => !row._errors || row._errors.length === 0).length} Valid Rows`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {currentStep === 'complete' && importSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
            <CardDescription>
              Your data has been successfully imported into the system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{importSummary.clients.created}</div>
                <div className="text-sm text-muted-foreground">Clients Created</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{importSummary.jobs.created}</div>
                <div className="text-sm text-muted-foreground">Jobs Created</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{importSummary.shifts.created}</div>
                <div className="text-sm text-muted-foreground">Shifts Created</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{importSummary.users.created}</div>
                <div className="text-sm text-muted-foreground">Users Created</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{importSummary.assignments.created}</div>
                <div className="text-sm text-muted-foreground">Assignments Created</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{importSummary.timeEntries.created}</div>
                <div className="text-sm text-muted-foreground">Time Entries Created</div>
              </div>
            </div>

            {importSummary.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {importSummary.errors.length} rows had errors during import. Check the logs for details.
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={resetImport} className="w-full">
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
