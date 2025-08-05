'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Type, Table, PenTool, Image } from 'lucide-react';

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

interface PDFConfigSettingsProps {
  selectedElement: PDFElement | null;
  onElementUpdate: (element: PDFElement) => void;
  onElementDelete: (elementId: string) => void;
  onAddElement: (type: PDFElement['type']) => void;
  elements: PDFElement[];
}

const elementTypeIcons = {
  text: Type,
  table: Table,
  signature: PenTool,
  image: Image,
};

const elementTypeLabels = {
  text: 'Text Field',
  table: 'Data Table',
  signature: 'Signature Box',
  image: 'Image/Logo',
};

export default function PDFConfigSettings({
  selectedElement,
  onElementUpdate,
  onElementDelete,
  onAddElement,
  elements,
}: PDFConfigSettingsProps) {
  const handleElementChange = (field: keyof PDFElement, value: any) => {
    if (!selectedElement) return;
    
    const updatedElement = {
      ...selectedElement,
      [field]: value,
    };
    
    onElementUpdate(updatedElement);
  };

  return (
    <div className="space-y-6">
      {/* Add New Elements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Elements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(elementTypeIcons).map(([type, Icon]) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => onAddElement(type as PDFElement['type'])}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {elementTypeLabels[type as keyof typeof elementTypeLabels]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Element List */}
      <Card>
        <CardHeader>
          <CardTitle>Template Elements ({elements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {elements.map((element) => {
              const Icon = elementTypeIcons[element.type];
              return (
                <div
                  key={element.id}
                  className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                    selectedElement?.id === element.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => onElementUpdate(element)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{element.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {element.type} • {element.x},{element.y}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {element.required && (
                      <Badge variant="secondary" className="text-xs">
                        Required
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onElementDelete(element.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Element Properties */}
      {selectedElement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(elementTypeIcons[selectedElement.type], {
                className: "h-5 w-5",
              })}
              Element Properties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={selectedElement.label}
                onChange={(e) => handleElementChange('label', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="dataKey">Data Key</Label>
              <Input
                id="dataKey"
                value={selectedElement.dataKey || ''}
                onChange={(e) => handleElementChange('dataKey', e.target.value)}
                placeholder="e.g., employeeName, jobNumber"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="x">X Position</Label>
                <Input
                  id="x"
                  type="number"
                  value={selectedElement.x}
                  onChange={(e) => handleElementChange('x', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="y">Y Position</Label>
                <Input
                  id="y"
                  type="number"
                  value={selectedElement.y}
                  onChange={(e) => handleElementChange('y', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={selectedElement.width}
                  onChange={(e) => handleElementChange('width', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  value={selectedElement.height}
                  onChange={(e) => handleElementChange('height', parseInt(e.target.value))}
                />
              </div>
            </div>

            {selectedElement.type === 'text' && (
              <>
                <div>
                  <Label htmlFor="fontSize">Font Size</Label>
                  <Input
                    id="fontSize"
                    type="number"
                    value={selectedElement.fontSize || 12}
                    onChange={(e) => handleElementChange('fontSize', parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="fontWeight">Font Weight</Label>
                  <Select
                    value={selectedElement.fontWeight || 'normal'}
                    onValueChange={(value) => handleElementChange('fontWeight', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="required"
                checked={selectedElement.required}
                onChange={(e) => handleElementChange('required', e.target.checked)}
              />
              <Label htmlFor="required">Required Field</Label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}