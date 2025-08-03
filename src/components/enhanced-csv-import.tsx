'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Upload, Download, FileText, AlertCircle, CheckCircle, Eye, Users, Building, Briefcase, Calendar, Clock, UserCheck, Loader2 } from 'lucide-react'
import { ImportType, CSV_TEMPLATES, CSVRow } from '@/lib/types/csv-enhanced'
import { CSVDataPreview } from './csv-data-preview'

interface ParsedCSVData {
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    headers: string[]
    importType: ImportType
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
  [key: string]: { created: number; updated: number }
  errors: Array<{ rowNumber: number; error: string }>
}

interface EnhancedCSVImportProps {
  externalCSVData?: string | null
}

const IMPORT_TYPE_ICONS = {
  comprehensive: Clock,
  timesheet: FileText,
  timesheet_template: FileText,
  employees: Users,
  companies: Building,
  jobs: Briefcase,
  shifts: Calendar,
  assignments: UserCheck
}

export default function EnhancedCSVImport({ externalCSVData }: EnhancedCSVImportProps) {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<ImportType>('comprehensive')
  const [isUploading, setIsUploading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null)
  const [editedData, setEditedData] = useState<CSVRow[]>([])
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [currentStep, setCurrentStep] = useState<'select' | 'upload' | 'preview' | 'complete'>('select')

  // Handle external CSV data from Gemini
  React.useEffect(() => {
    if (externalCSVData && !parsedData) {
      processExternalCSV(externalCSVData)
    }
  }, [externalCSVData, parsedData])

  const processExternalCSV = async (csvData: string) => {
    try {
      // Try to detect the import type from the CSV headers
      const lines = csvData.split('\n')
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
      
      let detectedType: ImportType = 'comprehensive'
      if (headers.includes('in_time') && headers.includes('out_time')) {
        detectedType = 'timesheet'
      } else if (headers.length === CSV_TEMPLATES.employees.headers.length) {
        detectedType = 'employees'
      }
      
      setImportType(detectedType)

      // Create a File object from the CSV string
      const blob = new Blob([csvData], { type: 'text/csv' })
      const file = new File([blob], 'gemini-generated.csv', { type: 'text/csv' })

      // Process it through the same parsing logic
      const formData = new FormData()
      formData.append('file', file)
      formData.append('importType', detectedType)

      const response = await fetch('/api/import/csv/enhanced-parse', {
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
        description: `Processed ${result.summary.totalRows} rows from Gemini AI as ${detectedType} import`
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
      formData.append('importType', importType)

      // Use special parser for timesheet template format
      const parseEndpoint = importType === 'timesheet_template' 
        ? '/api/import/csv/timesheet-template-parse'
        : '/api/import/csv/enhanced-parse'

      const response = await fetch(parseEndpoint, {
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

      const successMessage = importType === 'timesheet_template'
        ? `Parsed timesheet template: ${result.parsedMetadata?.employeeCount || 0} employees found`
        : `Found ${result.summary.totalRows} rows (${result.summary.validRows} valid, ${result.summary.invalidRows} with errors)`

      toast({
        title: 'CSV Parsed Successfully',
        description: successMessage
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

      const response = await fetch('/api/import/csv/enhanced-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          data: validRows,
          importType: importType
        })
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
      const response = await fetch(`/api/import/csv/enhanced-template?type=${importType}`)
      if (!response.ok) throw new Error('Failed to download template')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `holitime_${importType}_template.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Template Downloaded',
        description: `${CSV_TEMPLATES[importType].name} template has been downloaded`
      })
    } catch {
      toast({
        title: 'Download Failed',
        description: 'Failed to download CSV template',
        variant: 'destructive'
      })
    }
  }

  const resetImport = () => {
    setFile(null)
    setParsedData(null)
    setEditedData([])
    setImportSummary(null)
    setCurrentStep('select')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced CSV Import</h2>
          <p className="text-muted-foreground">
            Import data with flexible options for different data types
          </p>
        </div>
        <div className="flex gap-2">
          {currentStep === 'select' && (
            <Button 
              onClick={() => setCurrentStep('upload')} 
              variant="default"
            >
              <Upload className="mr-2 h-4 w-4" />
              Quick Upload
            </Button>
          )}
          {currentStep !== 'select' && (
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        <div className={`flex items-center space-x-2 ${currentStep === 'select' ? 'text-primary' : currentStep === 'upload' || currentStep === 'preview' || currentStep === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'select' ? 'bg-primary text-primary-foreground' : currentStep === 'upload' || currentStep === 'preview' || currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-muted'}`}>
            1
          </div>
          <span>Select Type</span>
        </div>
        <div className="flex-1 h-px bg-muted" />
        <div className={`flex items-center space-x-2 ${currentStep === 'upload' ? 'text-primary' : currentStep === 'preview' || currentStep === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-primary text-primary-foreground' : currentStep === 'preview' || currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-muted'}`}>
            2
          </div>
          <span>Upload & Parse</span>
        </div>
        <div className="flex-1 h-px bg-muted" />
        <div className={`flex items-center space-x-2 ${currentStep === 'preview' ? 'text-primary' : currentStep === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'preview' ? 'bg-primary text-primary-foreground' : currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-muted'}`}>
            3
          </div>
          <span>Preview & Import</span>
        </div>
        <div className="flex-1 h-px bg-muted" />
        <div className={`flex items-center space-x-2 ${currentStep === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-muted'}`}>
            4
          </div>
          <span>Complete</span>
        </div>
      </div>

      {/* Step 1: Select Import Type */}
      {currentStep === 'select' && (
        <div className="space-y-6">
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>
              <strong>Choose an import type below to get started.</strong> Click on a card to proceed to file upload, or download a template first to see the required format.
            </AlertDescription>
          </Alert>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(CSV_TEMPLATES).map(([key, template]) => {
              const Icon = IMPORT_TYPE_ICONS[key as ImportType]
              const isSelected = importType === key
              
              return (
                <Card 
                  key={key} 
                  className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
                  onClick={() => {
                    setImportType(key as ImportType)
                    setCurrentStep('upload')
                  }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5" />
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      Fields: {template.headers.length}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setImportType(key as ImportType)
                          downloadTemplate()
                        }}
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Template
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setImportType(key as ImportType)
                          setCurrentStep('upload')
                        }}
                      >
                        <Upload className="mr-2 h-3 w-3" />
                        Upload
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 2: Upload */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload {CSV_TEMPLATES[importType].name} File
            </CardTitle>
            <CardDescription>
              {CSV_TEMPLATES[importType].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="import-type">Import Type</Label>
              <Select value={importType} onValueChange={(value: ImportType) => setImportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CSV_TEMPLATES).map(([key, template]) => {
                    const Icon = IMPORT_TYPE_ICONS[key as ImportType]
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {template.name}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload Area */}
            <div className="space-y-4">
              <Label htmlFor="csv-file">CSV File Upload</Label>
              
              {/* Drag and Drop Zone */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add('border-primary', 'bg-primary/5')
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('border-primary', 'bg-primary/5')
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('border-primary', 'bg-primary/5')
                  const files = e.dataTransfer.files
                  if (files.length > 0 && files[0].type === 'text/csv') {
                    setFile(files[0])
                    setParsedData(null)
                    setEditedData([])
                    setImportSummary(null)
                  }
                }}
              >
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                    <div className="text-lg font-medium text-green-700">File Selected</div>
                    <div className="text-sm text-green-600">
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <div className="text-lg font-medium">Drop your CSV file here</div>
                      <div className="text-sm text-muted-foreground">or click to browse</div>
                    </div>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('csv-file')?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Choose CSV File
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Template Download */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <div className="font-medium">Need a template?</div>
                <div className="text-sm text-muted-foreground">
                  Download the CSV template to see the required format
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={downloadTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => setCurrentStep('select')} 
                variant="outline"
              >
                Back
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing CSV...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Parse & Preview CSV
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview & Import */}
      {currentStep === 'preview' && parsedData && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Import Preview - {CSV_TEMPLATES[importType].name}
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
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {parsedData.summary.invalidRows} rows have validation errors. Fix errors or they will be skipped during import.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={() => setCurrentStep('upload')} 
                  variant="outline"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={isImporting || parsedData.summary.validRows === 0}
                  className="flex-1"
                >
                  {isImporting ? 'Importing...' : `Import ${parsedData.summary.validRows} Valid Rows`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Preview */}
          <CSVDataPreview 
            data={editedData} 
            onDataChange={setEditedData}
            importType={importType}
          />
        </div>
      )}

      {/* Step 4: Complete */}
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
            <div className="grid gap-4">
              {Object.entries(importSummary).filter(([key]) => key !== 'errors').map(([key, stats]) => (
                <div key={key} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="text-sm">
                    <span className="text-green-600">+{stats.created}</span>
                    {stats.updated > 0 && <span className="text-blue-600 ml-2">~{stats.updated}</span>}
                  </div>
                </div>
              ))}
            </div>

            {importSummary.errors && importSummary.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {importSummary.errors.length} errors occurred during import. Check the logs for details.
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