"use client"

import React, { useState, useRef, useEffect } from "react"
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from '@/components/ui/button'

import { Input } from '@mantine/core'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'

import { 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Save, 
  RotateCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  PenTool,
  Type
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

interface PDFViewerProps {
  documentUrl: string
  documentName: string
  canEdit?: boolean
  onSave?: (formData: any) => void
}

interface FormField {
  id: string
  type: 'text' | 'signature' | 'date' | 'checkbox'
  x: number
  y: number
  width: number
  height: number
  value: string
  placeholder?: string
  required?: boolean
}

export default function PDFViewer({ documentUrl, documentName, canEdit = false, onSave }: PDFViewerProps) {
  const { toast } = useToast()
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Sample form fields - in a real app, these would come from the PDF or be configured
  useEffect(() => {
    if (canEdit) {
      setFormFields([
        {
          id: 'employee_name',
          type: 'text',
          x: 100,
          y: 150,
          width: 200,
          height: 30,
          value: '',
          placeholder: 'Employee Name',
          required: true
        },
        {
          id: 'date',
          type: 'date',
          x: 350,
          y: 150,
          width: 150,
          height: 30,
          value: '',
          placeholder: 'Date',
          required: true
        },
        {
          id: 'signature',
          type: 'signature',
          x: 100,
          y: 400,
          width: 200,
          height: 60,
          value: '',
          placeholder: 'Click to sign',
          required: true
        }
      ])
    }
  }, [canEdit])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
  }

  const onDocumentLoadError = (error: Error) => {
    setError(`Failed to load PDF: ${error.message}`)
    setLoading(false)
  }

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handlePrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages))
  }

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, value } : field
    ))
  }

  const handleSaveForm = async () => {
    const requiredFields = formFields.filter(field => field.required && !field.value)
    
    if (requiredFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in all required fields: ${requiredFields.map(f => f.placeholder).join(', ')}`,
        variant: "destructive",
      })
      return
    }

    const formData = formFields.reduce((acc, field) => {
      acc[field.id] = field.value
      return acc
    }, {} as Record<string, string>)

    try {
      if (onSave) {
        await onSave(formData)
        toast({
          title: "Form Saved",
          description: "Your form has been saved successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save form. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = documentUrl
    link.download = documentName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Document</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {documentName}
              </CardTitle>
              <CardDescription>
                Page {pageNumber} of {numPages} • Scale: {Math.round(scale * 100)}%
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <>
                  <Button
                    variant={isEditMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsEditMode(!isEditMode)}
                  >
                    <PenTool className="mr-2 h-4 w-4" />
                    {isEditMode ? 'Exit Edit' : 'Edit Form'}
                  </Button>
                  {isEditMode && (
                    <Button size="sm" onClick={handleSaveForm}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Form
                    </Button>
                  )}
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {pageNumber} / {numPages}
            </span>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={pageNumber >= numPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="mx-4 h-4 w-px bg-border" />
            <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={scale <= 0.5}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={scale >= 3.0}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PDF Viewer */}
      <Card>
        <CardContent className="p-4">
          <div className="relative border rounded-lg overflow-auto bg-gray-50" style={{ height: '600px' }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-muted-foreground">Loading document...</div>
              </div>
            )}
            
            <div className="relative">
              <Document
                file={documentUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading=""
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>

              {/* Form Fields Overlay */}
              {isEditMode && canEdit && (
                <div className="absolute inset-0">
                  {formFields.map((field) => (
                    <div
                      key={field.id}
                      className="absolute border-2 border-blue-500 bg-white/80"
                      style={{
                        left: field.x * scale,
                        top: field.y * scale,
                        width: field.width * scale,
                        height: field.height * scale,
                      }}
                    >
                      {field.type === 'text' || field.type === 'date' ? (
                        <Input
                          type={field.type === 'date' ? 'date' : 'text'}
                          value={field.value}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          className="h-full border-0 text-xs"
                          required={field.required}
                        />
                      ) : field.type === 'signature' ? (
                        <Button
                          variant="outline"
                          className="h-full w-full text-xs"
                          onClick={() => {
                            // In a real app, this would open a signature pad
                            handleFieldChange(field.id, 'Signed')
                          }}
                        >
                          {field.value || field.placeholder}
                        </Button>
                      ) : null}
                      {field.required && !field.value && (
                        <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
