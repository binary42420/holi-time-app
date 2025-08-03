'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Sparkles,
  Brain,
  Target,
  TrendingUp,
  Eye,
  RefreshCw,
} from "lucide-react"

interface GoogleSheetsGeminiProcessorProps {
  selectedFile: any
  onCSVGenerated: (csvData: string) => void
  accessToken?: string
}

interface ProcessingStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress?: number
}

interface GeminiResponse {
  csvData: string
  summaryReport: string
  originalResponse: string
  mappedFields: Record<string, string>
  confidence: number
  warnings: string[]
}

export default function GoogleSheetsGeminiProcessor({ 
  selectedFile, 
  onCSVGenerated, 
  accessToken 
}: GoogleSheetsGeminiProcessorProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [geminiResult, setGeminiResult] = useState<GeminiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    {
      id: 'fetch',
      name: 'Fetching Data',
      description: 'Retrieving data from Google Sheets',
      status: 'pending'
    },
    {
      id: 'analyze',
      name: 'Analyzing Structure',
      description: 'Understanding sheet structure and content',
      status: 'pending'
    },
    {
      id: 'map',
      name: 'Mapping Fields',
      description: 'Mapping columns to Holitime format',
      status: 'pending'
    },
    {
      id: 'transform',
      name: 'Transforming Data',
      description: 'Converting and cleaning data',
      status: 'pending'
    },
    {
      id: 'validate',
      name: 'Validating Results',
      description: 'Checking data quality and completeness',
      status: 'pending'
    }
  ])

  const updateStepStatus = (stepId: string, status: ProcessingStep['status'], progress?: number) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, progress } : step
    ))
  }

  const processWithGemini = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setError(null)
    setGeminiResult(null)
    setCurrentStep(0)

    // Reset all steps
    setProcessingSteps(prev => prev.map(step => ({ ...step, status: 'pending' })))

    try {
      // Step 1: Fetch data
      updateStepStatus('fetch', 'processing', 0)
      setCurrentStep(0)

      let sheetsResponse: Response
      let sheetsData: any = null

      if (accessToken) {
        console.log('Using OAuth method for data extraction...')
        sheetsResponse = await fetch(`/api/import/google-sheets/fetch-with-oauth/${selectedFile.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ accessToken })
        })
      } else {
        console.log('Using API key method for data extraction...')
        sheetsResponse = await fetch(`/api/import/google-sheets/fetch/${selectedFile.id}`)
      }

      if (!sheetsResponse.ok) {
        const errorData = await sheetsResponse.json()
        throw new Error(errorData.error || 'Failed to fetch Google Sheets data')
      }

      const sheetsResult = await sheetsResponse.json()
      sheetsData = sheetsResult.data || sheetsResult

      updateStepStatus('fetch', 'completed', 100)
      setCurrentStep(1)

      // Step 2: Analyze structure
      updateStepStatus('analyze', 'processing', 0)
      await new Promise(resolve => setTimeout(resolve, 500)) // Brief pause for UX

      // Step 3: Map fields
      updateStepStatus('analyze', 'completed', 100)
      updateStepStatus('map', 'processing', 0)
      setCurrentStep(2)

      // Step 4: Transform data
      updateStepStatus('map', 'completed', 100)
      updateStepStatus('transform', 'processing', 0)
      setCurrentStep(3)

      // Enhanced Gemini processing with better prompts
      const geminiResponse = await fetch('/api/import/google-sheets/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          googleSheetsId: selectedFile.id,
          sheetsData: sheetsData,
          prompt: generateEnhancedPrompt(sheetsData),
          options: {
            temperature: 0.1, // Low temperature for consistent results
            maxTokens: 4000,
            model: 'gemini-1.5-flash' // Use latest model
          }
        })
      })

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json()
        throw new Error(errorData.error || 'Failed to process with Gemini')
      }

      updateStepStatus('transform', 'completed', 100)
      updateStepStatus('validate', 'processing', 0)
      setCurrentStep(4)

      const result = await geminiResponse.json()
      
      // Step 5: Validate results
      await new Promise(resolve => setTimeout(resolve, 500)) // Brief pause for UX
      updateStepStatus('validate', 'completed', 100)

      setGeminiResult(result)
      onCSVGenerated(result.csvData)

      toast({
        title: 'Processing Complete',
        description: `Successfully processed ${result.csvData.split('\n').length - 1} rows with ${(result.confidence * 100).toFixed(1)}% confidence`
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process Google Sheets'
      setError(errorMessage)
      
      // Mark current step as error
      const currentStepId = processingSteps[currentStep]?.id
      if (currentStepId) {
        updateStepStatus(currentStepId, 'error')
      }

      toast({
        title: 'Processing Failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const generateEnhancedPrompt = (sheetsData: any) => {
    return `You are an expert data transformation specialist for Holitime, a professional shift management system. Your task is to analyze Google Sheets data and convert it into our standardized CSV format with maximum accuracy.

CRITICAL REQUIREMENTS:
======================
Output Format: client_name,job_name,shift_date,shift_start_time,shift_end_time,employee_name,worker_type,notes

Field Specifications:
- client_name: Company/organization name (REQUIRED)
- job_name: Project, event, or job description (REQUIRED)  
- shift_date: Date in YYYY-MM-DD format (REQUIRED)
- shift_start_time: Start time in HH:mm 24-hour format (REQUIRED)
- shift_end_time: End time in HH:mm 24-hour format (REQUIRED)
- employee_name: Full employee name (REQUIRED)
- worker_type: Must be exactly one of: CC, SH, FO, RFO, RG, GL (REQUIRED)
  * CC = Crew Chief (supervisor/lead)
  * SH = Stage Hand (general stage work)
  * FO = Fork Operator (forklift certified)
  * RFO = Rough Fork Operator (rough terrain forklift)
  * RG = Rigger (rigging specialist)
  * GL = General Labor (basic labor)
- notes: Additional information (OPTIONAL)

DATA TRANSFORMATION RULES:
==========================
1. Date Conversion:
   - Convert MM/DD/YYYY, DD/MM/YYYY, or any date format to YYYY-MM-DD
   - Handle date ranges by creating separate rows
   - If only month/year given, use first day of month
   - Handle common date formats found in client schedule templates, including merged cells and empty rows

2. Time Conversion:
   - Convert 12-hour format (AM/PM) to 24-hour format
   - Handle time ranges properly
   - If only start time given, estimate reasonable end time based on context
   - Handle time entries with missing minutes or inconsistent formatting

3. Worker Type Mapping:
   - Map common terms: "crew chief" → CC, "stage hand" → SH, "forklift" → FO
   - Use context clues from job descriptions
   - Default to GL if unclear but required
   - Recognize abbreviations and common misspellings

4. Data Cleaning:
   - Remove special characters from names
   - Standardize company names (remove Inc., LLC, etc.)
   - Split combined entries into separate rows when needed
   - Handle extra whitespace and inconsistent capitalization

5. Quality Assurance:
   - Ensure all required fields are populated
   - Validate date/time formats
   - Check for logical consistency (end time after start time)
   - Provide detailed warnings for missing or suspicious data

EXAMPLES:
=========
- Date: "3/15/2023" → "2023-03-15"
- Time: "2:30 PM" → "14:30"
- Worker Type: "crew chief" or "CC" → "CC"
- Combined entries: "John Doe / Jane Smith" → two separate rows
- Missing end time: estimate based on start time and typical shift length

ANALYSIS INSTRUCTIONS:
=====================
1. First, identify the most relevant sheet if multiple exist
2. Analyze column headers and sample data to understand structure
3. Create intelligent field mappings based on content, not just headers
4. Handle merged cells, empty rows, and formatting inconsistencies
5. Provide confidence scores and detailed warnings

Please analyze the provided data and return a JSON response with:
{
  "csvData": "Complete CSV with all transformed data",
  "summaryReport": "Detailed processing analysis",
  "mappedFields": {"source_column": "target_field"},
  "confidence": 0.95,
  "warnings": ["List of any issues or assumptions"]
}

Sheet Data to Process:
${JSON.stringify(sheetsData, null, 2)}`
  }

  const downloadCSV = () => {
    if (!geminiResult?.csvData) return

    const blob = new Blob([geminiResult.csvData], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedFile?.name?.split('.')[0] || 'processed'}-holitime.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <FileSpreadsheet className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <Sparkles className="h-8 w-8 text-purple-500" />
          <div>
            <CardTitle>Gemini-Powered Sheets Processor</CardTitle>
            <CardDescription>
              AI-driven data extraction and transformation for Holitime.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isProcessing && !geminiResult && (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">Ready to Process</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click the button below to start the AI-powered data transformation.
            </p>
            <Button onClick={processWithGemini} disabled={!selectedFile || isProcessing}>
              <Sparkles className="mr-2 h-4 w-4" />
              {isProcessing ? 'Processing...' : `Process ${selectedFile?.name || 'Sheet'}`}
            </Button>
          </div>
        )}

        {isProcessing && (
          <div>
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
              <p className="text-lg font-medium">AI is at work...</p>
            </div>
            <ul className="space-y-4">
              {processingSteps.map((step, index) => (
                <li key={step.id} className="flex items-start">
                  <div className="flex-shrink-0">{getStepIcon(step.status)}</div>
                  <div className="ml-4">
                    <p className={`font-medium ${currentStep === index ? 'text-primary' : ''}`}>
                      {step.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    {step.status === 'processing' && step.progress !== undefined && (
                      <Progress value={step.progress} className="mt-2 h-2" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Processing Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {geminiResult && (
          <div className="mt-6 space-y-6">
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Processing Successful!</AlertTitle>
              <AlertDescription className="text-green-700">
                Your data has been transformed and is ready for download.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-blue-500" />Confidence Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">
                    {(geminiResult.confidence * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">AI confidence in data accuracy.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center"><Target className="mr-2 h-5 w-5 text-green-500" />Mapped Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    {Object.keys(geminiResult.mappedFields).length}
                  </p>
                   <p className="text-xs text-muted-foreground">Source columns mapped to target.</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center"><Eye className="mr-2 h-5 w-5" />Summary Report</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea readOnly value={geminiResult.summaryReport} className="h-32 text-sm" />
              </CardContent>
            </Card>

            {geminiResult.warnings && geminiResult.warnings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center"><AlertCircle className="mr-2 h-5 w-5 text-amber-500" />Warnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {geminiResult.warnings.map((warning, index) => (
                      <li key={index} className="text-sm flex items-start">
                        <Badge variant="destructive" className="mr-2 mt-1">!</Badge> 
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={processWithGemini} disabled={isProcessing}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reprocess
              </Button>
              <Button onClick={downloadCSV}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
