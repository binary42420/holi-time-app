'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Removed react-beautiful-dnd in favor of custom mouse-based drag handling
import { ArrowLeft, Save, Download, Eye, Settings, Move } from "lucide-react";
import PDFConfigSettings from '@/components/pdf-config-settings';
import { useToast } from '@/hooks/use-toast';

interface PDFElement {
  id: string;
  type: 'text' | 'table' | 'signature' | 'image';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataKey?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  required: boolean;
}

interface PDFConfiguration {
  id: string;
  name: string;
  pageSize: 'letter' | 'a4';
  pageOrientation: 'portrait' | 'landscape';
  elements: PDFElement[];
  createdAt: string;
  updatedAt: string;
}

const defaultElements: PDFElement[] = [
  {
    id: 'header-title',
    type: 'text',
    label: 'HOLI TIMESHEET',
    x: 306,
    y: 60,
    width: 200,
    height: 30,
    fontSize: 24,
    fontWeight: 'bold',
    required: true,
    dataKey: 'headerTitle'
  },
  {
    id: 'job-number',
    type: 'text',
    label: 'Job#:',
    x: 50,
    y: 100,
    width: 50,
    height: 20,
    fontSize: 10,
    fontWeight: 'normal',
    required: true,
    dataKey: 'jobNumber'
  },
  {
    id: 'job-value',
    type: 'text',
    label: 'Job Value',
    x: 100,
    y: 100,
    width: 200,
    height: 20,
    fontSize: 10,
    fontWeight: 'normal',
    required: true,
    dataKey: 'jobName'
  },
  {
    id: 'customer-label',
    type: 'text',
    label: 'Customer:',
    x: 50,
    y: 120,
    width: 60,
    height: 20,
    fontSize: 10,
    fontWeight: 'normal',
    required: true,
    dataKey: 'customerLabel'
  },
  {
    id: 'customer-value',
    type: 'text',
    label: 'Customer Value',
    x: 110,
    y: 120,
    width: 200,
    height: 20,
    fontSize: 10,
    fontWeight: 'normal',
    required: true,
    dataKey: 'customerName'
  },
  {
    id: 'date-label',
    type: 'text',
    label: 'Date:',
    x: 350,
    y: 100,
    width: 40,
    height: 20,
    fontSize: 10,
    fontWeight: 'normal',
    required: true,
    dataKey: 'dateLabel'
  },
  {
    id: 'employee-table',
    type: 'table',
    label: 'Employee Table',
    x: 50,
    y: 180,
    width: 500,
    height: 200,
    fontSize: 8,
    fontWeight: 'normal',
    required: true,
    dataKey: 'employeeTable'
  },
  {
    id: 'customer-sig-label',
    type: 'text',
    label: 'Customer Signature:',
    x: 50,
    y: 400,
    width: 120,
    height: 20,
    fontSize: 12,
    fontWeight: 'normal',
    required: true,
    dataKey: 'customerSignatureLabel'
  },
  {
    id: 'customer-sig-box',
    type: 'signature',
    label: 'Customer Signature Box',
    x: 50,
    y: 420,
    width: 200,
    height: 40,
    fontSize: 10,
    fontWeight: 'normal',
    required: true,
    dataKey: 'customerSignatureBox'
  },
];

export default function PDFConfigPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [configuration, setConfiguration] = useState<PDFConfiguration>({
    id: 'timesheet-default',
    name: 'Timesheet Default Configuration',
    pageSize: 'letter',
    pageOrientation: 'portrait',
    elements: defaultElements,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  const [selectedElement, setSelectedElement] = useState<PDFElement | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedElement, setDraggedElement] = useState<PDFElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Convert PDF points to screen pixels (assuming 96 DPI)
  const pointsToPixels = (points: number) => (points * 96) / 72;
  const pixelsToPoints = (pixels: number) => (pixels * 72) / 96;

  // Calculate canvas dimensions based on page size
  const pageWidth = configuration.pageSize === 'letter' ? 612 : 595; // points
  const pageHeight = configuration.pageSize === 'letter' ? 792 : 842; // points
  const canvasWidth = pointsToPixels(pageWidth);
  const canvasHeight = pointsToPixels(pageHeight);

  // Custom drag and drop implementation using mouse events for better control

  const handleElementPositionUpdate = (elementId: string, x: number, y: number) => {
    const updatedElements = configuration.elements.map(element => {
      if (element.id === elementId) {
        return {
          ...element,
          x: pixelsToPoints(x),
          y: pixelsToPoints(y)
        };
      }
      return element;
    });

    setConfiguration(prev => ({
      ...prev,
      elements: updatedElements,
      updatedAt: new Date().toISOString()
    }));
  };

  // Mouse-based drag handlers for more intuitive positioning
  const handleMouseDown = (e: React.MouseEvent, element: PDFElement) => {
    if (isPreviewMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = pdfContainerRef.current?.getBoundingClientRect();
    
    if (!containerRect) return;
    
    setDraggedElement(element);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    setSelectedElement(element);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedElement || !pdfContainerRef.current) return;
    
    e.preventDefault();
    
    const containerRect = pdfContainerRef.current.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;
    
    // Constrain to canvas bounds
    const maxX = canvasWidth - pointsToPixels(draggedElement.width);
    const maxY = canvasHeight - pointsToPixels(draggedElement.height);
    
    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));
    
    // Update element position
    const updatedElements = configuration.elements.map(element => {
      if (element.id === draggedElement.id) {
        return {
          ...element,
          x: pixelsToPoints(constrainedX),
          y: pixelsToPoints(constrainedY)
        };
      }
      return element;
    });

    setConfiguration(prev => ({
      ...prev,
      elements: updatedElements,
      updatedAt: new Date().toISOString()
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedElement(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!draggedElement || !pdfContainerRef.current) return;
        
        const containerRect = pdfContainerRef.current.getBoundingClientRect();
        const newX = e.clientX - containerRect.left - dragOffset.x;
        const newY = e.clientY - containerRect.top - dragOffset.y;
        
        // Constrain to canvas bounds
        const maxX = canvasWidth - pointsToPixels(draggedElement.width);
        const maxY = canvasHeight - pointsToPixels(draggedElement.height);
        
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        // Update element position
        const updatedElements = configuration.elements.map(element => {
          if (element.id === draggedElement.id) {
            return {
              ...element,
              x: pixelsToPoints(constrainedX),
              y: pixelsToPoints(constrainedY)
            };
          }
          return element;
        });

        setConfiguration(prev => ({
          ...prev,
          elements: updatedElements,
          updatedAt: new Date().toISOString()
        }));
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setDraggedElement(null);
        setDragOffset({ x: 0, y: 0 });
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, draggedElement, dragOffset, canvasWidth, canvasHeight, pointsToPixels, pixelsToPoints]);

  const handleElementSelect = (element: PDFElement) => {
    setSelectedElement(element);
  };

  const handleElementUpdate = (updatedElement: PDFElement) => {
    const updatedElements = configuration.elements.map(element => 
      element.id === updatedElement.id ? updatedElement : element
    );
    
    setConfiguration(prev => ({
      ...prev,
      elements: updatedElements,
      updatedAt: new Date().toISOString()
    }));
    
    setSelectedElement(updatedElement);
  };

  const handleAddElement = (elementType: PDFElement['type']) => {
    const newElement: PDFElement = {
      id: `element-${Date.now()}`,
      type: elementType,
      label: `New ${elementType}`,
      x: 100,
      y: 100,
      width: 100,
      height: 30,
      fontSize: 12,
      fontWeight: 'normal',
      required: false,
      dataKey: `custom${elementType.charAt(0).toUpperCase() + elementType.slice(1)}${Date.now()}`
    };

    setConfiguration(prev => ({
      ...prev,
      elements: [...prev.elements, newElement],
      updatedAt: new Date().toISOString()
    }));
    
    setSelectedElement(newElement);
  };

  const handleDeleteElement = (elementId: string) => {
    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }

    const updatedElements = configuration.elements.filter(element => element.id !== elementId);
    setConfiguration(prev => ({
      ...prev,
      elements: updatedElements,
      updatedAt: new Date().toISOString()
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/pdf-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configuration),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      toast({
        title: "Success",
        description: "PDF configuration saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSample = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/pdf-config/sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configuration),
      });

      if (!response.ok) {
        throw new Error('Failed to generate sample PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheet-sample-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Sample PDF downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to generate sample PDF',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold">PDF Configuration Tool</h1>
              <p className="text-muted-foreground">
                Drag and drop elements to configure timesheet PDF layout
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {isPreviewMode ? 'Edit Mode' : 'Preview Mode'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadSample}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Sample
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* PDF Canvas */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>PDF Template Canvas</span>
                  <Badge variant="secondary">
                    {configuration.pageSize.toUpperCase()} • {configuration.pageOrientation}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={pdfContainerRef}
                  className={`relative border-2 border-dashed bg-white mx-auto ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
                  }`}
                  style={{
                    width: canvasWidth,
                    height: canvasHeight,
                    maxWidth: '100%',
                    aspectRatio: `${pageWidth}/${pageHeight}`,
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  {/* PDF Elements */}
                  {configuration.elements.map((element) => (
                    <div
                      key={element.id}
                      className={`absolute border-2 cursor-move transition-all select-none ${
                        selectedElement?.id === element.id
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-400 bg-gray-100/50 hover:border-primary'
                      } ${isDragging && draggedElement?.id === element.id ? 'shadow-lg z-50' : ''}`}
                      style={{
                        left: pointsToPixels(element.x),
                        top: pointsToPixels(element.y),
                        width: pointsToPixels(element.width),
                        height: pointsToPixels(element.height),
                      }}
                      onMouseDown={(e) => handleMouseDown(e, element)}
                      onClick={() => handleElementSelect(element)}
                    >
                      <div className="flex items-center justify-between p-1 bg-white/90 text-xs">
                        <span className="font-medium truncate">{element.label}</span>
                        <Move className="h-3 w-3 text-gray-500" />
                      </div>
                      <div className="p-2 text-xs text-gray-600">
                        {element.type === 'table' ? '[Table Data]' : element.label}
                      </div>
                      {element.required && (
                        <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                  ))}
                  
                  {/* Canvas Grid (optional) */}
                  <div className="absolute inset-0 pointer-events-none opacity-10">
                    <svg width="100%" height="100%">
                      <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="gray" strokeWidth="1"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <PDFConfigSettings
              selectedElement={selectedElement}
              onElementUpdate={handleElementUpdate}
              onElementDelete={handleDeleteElement}
              onAddElement={handleAddElement}
              elements={configuration.elements}
            />
          </div>
        </div>
      </div>
    </div>
  );
}