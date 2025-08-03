'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Edit, Save, X, Check } from "lucide-react"
import { CSVRow } from '@/app/api/import/csv/parse/route'
import { ImportType } from '@/lib/types/csv-enhanced'

interface CSVDataPreviewProps {
  data: CSVRow[]
  onDataChange: (data: CSVRow[]) => void
  importType?: ImportType
}

const WORKER_TYPES = ['CC', 'SH', 'FO', 'RFO', 'RG', 'GL']

const FIELD_LABELS: Record<string, string> = {
  // Comprehensive/Legacy format
  client_name: 'Client Name',
  contact_name: 'Contact Name',
  contact_phone: 'Contact Phone',
  job_name: 'Job Name',
  job_start_date: 'Job Start Date',
  shift_date: 'Shift Date',
  shift_start_time: 'Shift Start Time',
  shift_end_time: 'Shift End Time',
  employee_name: 'Employee Name',
  employee_email: 'Employee Email',
  employee_phone: 'Employee Phone',
  worker_type: 'Worker Type',
  clock_in_1: 'Clock In 1',
  clock_out_1: 'Clock Out 1',
  clock_in_2: 'Clock In 2',
  clock_out_2: 'Clock Out 2',
  clock_in_3: 'Clock In 3',
  clock_out_3: 'Clock Out 3',
  // Timesheet format
  location: 'Location',
  date_time: 'Date/Time',
  in_time: 'In Time',
  out_time: 'Out Time',
  in_time_2: 'In Time 2',
  out_time_2: 'Out Time 2',
  in_time_3: 'In Time 3',
  out_time_3: 'Out Time 3',
  in_time_4: 'In Time 4',
  out_time_4: 'Out Time 4',
  total_hours: 'Total Hours',
  reg_hours: 'Regular Hours',
  ot_hours: 'Overtime Hours',
  dt_hours: 'Double Time Hours',
  ta: 'Time Adjustment',
  // Timesheet Template format
  client_po: 'Client PO',
  hands_on_job_number: 'Hands On Job #',
  employee_initials: 'Employee Initials',
  // Employee format
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  role: 'Role',
  company_name: 'Company Name',
  crew_chief_eligible: 'Crew Chief Eligible',
  fork_operator_eligible: 'Fork Operator Eligible',
  certifications: 'Certifications',
  // Company format
  address: 'Address',
  website: 'Website',
  description: 'Description',
  // Job format
  start_date: 'Start Date',
  end_date: 'End Date',
  budget: 'Budget',
  status: 'Status',
  notes: 'Notes',
  // Shift format
  date: 'Date',
  start_time: 'Start Time',
  end_time: 'End Time',
  requested_workers: 'Requested Workers',
  required_crew_chiefs: 'Required Crew Chiefs',
  required_stagehands: 'Required Stagehands',
  required_fork_operators: 'Required Fork Operators',
  required_reach_fork_operators: 'Required Reach Fork Operators',
  required_riggers: 'Required Riggers',
  required_general_laborers: 'Required General Laborers',
  // Assignment format
  shift_id: 'Shift ID',
  role_code: 'Role Code'
}

export function CSVDataPreview({ data, onDataChange, importType }: CSVDataPreviewProps) {
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editingData, setEditingData] = useState<CSVRow | null>(null)
  const [showErrorsOnly, setShowErrorsOnly] = useState(false)
  const [editingErrorRow, setEditingErrorRow] = useState<number | null>(null)
  const [editingErrorData, setEditingErrorData] = useState<CSVRow | null>(null)
  const [approvedErrors, setApprovedErrors] = useState<Set<string>>(new Set())

  const filteredData = showErrorsOnly 
    ? data.filter(row => row._errors && row._errors.length > 0)
    : data

  const startEdit = (rowIndex: number) => {
    const actualIndex = data.findIndex(row => row._rowNumber === filteredData[rowIndex]._rowNumber)
    setEditingRow(actualIndex)
    setEditingData({ ...data[actualIndex] })
  }

  const cancelEdit = () => {
    setEditingRow(null)
    setEditingData(null)
  }

  const startErrorEdit = (rowNumber: number) => {
    const row = data.find(r => r._rowNumber === rowNumber)
    if (row) {
      setEditingErrorRow(rowNumber)
      setEditingErrorData({ ...row })
    }
  }

  const cancelErrorEdit = () => {
    setEditingErrorRow(null)
    setEditingErrorData(null)
  }

  const saveErrorEdit = () => {
    if (editingErrorData && editingErrorRow !== null) {
      const validatedRow = validateEditedRow(editingErrorData)
      const updatedData = data.map(row =>
        row._rowNumber === editingErrorRow ? validatedRow : row
      )
      onDataChange(updatedData)
      setEditingErrorRow(null)
      setEditingErrorData(null)
    }
  }

  const toggleErrorApproval = (rowNumber: number, errorIndex: number) => {
    const errorKey = `${rowNumber}-${errorIndex}`
    const newApprovedErrors = new Set(approvedErrors)
    if (newApprovedErrors.has(errorKey)) {
      newApprovedErrors.delete(errorKey)
    } else {
      newApprovedErrors.add(errorKey)
    }
    setApprovedErrors(newApprovedErrors)
  }

  const saveEdit = () => {
    if (editingRow === null || !editingData) return

    // Re-validate the edited row
    const validatedRow = validateEditedRow(editingData)
    
    const newData = [...data]
    newData[editingRow] = validatedRow
    onDataChange(newData)
    
    setEditingRow(null)
    setEditingData(null)
  }

  const validateEditedRow = (row: CSVRow): CSVRow => {
    const errors: string[] = []

    // Required field validation
    if (!row.client_name?.trim()) errors.push('Client name is required')
    if (!row.job_name?.trim()) errors.push('Job name is required')
    if (!row.shift_date?.trim()) errors.push('Shift date is required')
    if (!row.shift_start_time?.trim()) errors.push('Shift start time is required')
    if (!row.shift_end_time?.trim()) errors.push('Shift end time is required')
    if (!row.employee_name?.trim()) errors.push('Employee name is required')
    if (!row.worker_type?.trim()) errors.push('Worker type is required')

    // Date validation
    if (row.job_start_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.job_start_date)) {
      errors.push('Job start date must be in YYYY-MM-DD format')
    }
    if (row.shift_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.shift_date)) {
      errors.push('Shift date must be in YYYY-MM-DD format')
    }

    // Time validation
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (row.shift_start_time && !timeRegex.test(row.shift_start_time)) {
      errors.push('Shift start time must be in HH:MM format (24-hour)')
    }
    if (row.shift_end_time && !timeRegex.test(row.shift_end_time)) {
      errors.push('Shift end time must be in HH:MM format (24-hour)')
    }

    // Email validation
    if (row.employee_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.employee_email)) {
      errors.push('Employee email format is invalid')
    }

    // Worker type validation
    if (row.worker_type && !WORKER_TYPES.includes(row.worker_type)) {
      errors.push('Worker type must be one of: CC, SH, FO, RFO, RG, GL')
    }

    // Clock time validation
    for (let i = 1; i <= 3; i++) {
      const clockInKey = `clock_in_${i}` as keyof CSVRow
      const clockOutKey = `clock_out_${i}` as keyof CSVRow
      const clockIn = row[clockInKey] as string
      const clockOut = row[clockOutKey] as string

      if (clockIn && !timeRegex.test(clockIn)) {
        errors.push(`Clock in ${i} must be in HH:MM format (24-hour)`)
      }
      if (clockOut && !timeRegex.test(clockOut)) {
        errors.push(`Clock out ${i} must be in HH:MM format (24-hour)`)
      }
    }

    return {
      ...row,
      _errors: errors
    }
  }

  const updateEditingField = (field: keyof CSVRow, value: string) => {
    if (!editingData) return
    setEditingData({
      ...editingData,
      [field]: value
    })
  }

  const renderEditableCell = (row: CSVRow, field: keyof CSVRow) => {
    if (editingRow === null || editingData === null) {
      return <span className="text-sm">{String(row[field] || '-')}</span>
    }

    const value = String(editingData[field] || '')

    if (field === 'worker_type') {
      return (
        <Select value={value} onValueChange={(val) => updateEditingField(field, val)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORKER_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    return (
      <Input
        value={value}
        onChange={(e) => updateEditingField(field, e.target.value)}
        className="h-8 text-sm"
        placeholder={FIELD_LABELS[field]}
      />
    )
  }

  const renderCell = (row: CSVRow, field: keyof CSVRow) => {
    const actualRowIndex = data.findIndex(r => r._rowNumber === row._rowNumber)
    const isEditing = editingRow === actualRowIndex

    if (isEditing) {
      return renderEditableCell(row, field)
    }

    const value = row[field]
    const hasError = row._errors?.some(error => 
      error.toLowerCase().includes(field.replace('_', ' '))
    )

    return (
      <span className={`text-sm ${hasError ? 'text-red-600' : ''}`}>
        {String(value || '-')}
      </span>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Data Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showErrorsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowErrorsOnly(!showErrorsOnly)}
            >
              {showErrorsOnly ? 'Show All' : 'Show Errors Only'}
            </Button>
            <Badge variant="outline">
              {filteredData.length} rows
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full">
          <div className="min-w-[1200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead className="min-w-[120px]">Client</TableHead>
                  <TableHead className="min-w-[120px]">Job</TableHead>
                  <TableHead className="min-w-[100px]">Shift Date</TableHead>
                  <TableHead className="min-w-[140px]">Shift Time</TableHead>
                  <TableHead className="min-w-[120px]">Employee</TableHead>
                  <TableHead className="min-w-[80px]">Type</TableHead>
                  <TableHead className="min-w-[200px]">Clock In/Out</TableHead>
                  <TableHead className="min-w-[80px]">Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredData.map((row, index) => {
                const actualRowIndex = data.findIndex(r => r._rowNumber === row._rowNumber)
                const isEditing = editingRow === actualRowIndex
                const hasErrors = row._errors && row._errors.length > 0

                return (
                  <TableRow key={row._rowNumber} className={hasErrors ? 'bg-red-50' : ''}>
                    <TableCell className="font-mono text-xs">
                      {row._rowNumber}
                    </TableCell>
                    <TableCell>{renderCell(row, 'client_name')}</TableCell>
                    <TableCell>{renderCell(row, 'job_name')}</TableCell>
                    <TableCell>{renderCell(row, 'shift_date')}</TableCell>
                    <TableCell className="text-xs">
                      {row.shift_start_time} - {row.shift_end_time}
                    </TableCell>
                    <TableCell>{renderCell(row, 'employee_name')}</TableCell>
                    <TableCell>{renderCell(row, 'worker_type')}</TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-1">
                        {row.clock_in_1 && (
                          <div>{row.clock_in_1} - {row.clock_out_1 || 'Active'}</div>
                        )}
                        {row.clock_in_2 && (
                          <div>{row.clock_in_2} - {row.clock_out_2 || 'Active'}</div>
                        )}
                        {row.clock_in_3 && (
                          <div>{row.clock_in_3} - {row.clock_out_3 || 'Active'}</div>
                        )}
                        {!row.clock_in_1 && <span className="text-muted-foreground">No times</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {hasErrors ? (
                        <Badge variant="destructive" className="text-xs">
                          {row._errors!.length} error{row._errors!.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Valid</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={saveEdit}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startEdit(index)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Enhanced Error Details */}
        {filteredData.some(row => row._errors && row._errors.length > 0) && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-lg">Validation Errors</h4>
              <Badge variant="destructive">
                {filteredData.filter(row => row._errors && row._errors.length > 0).length} rows with errors
              </Badge>
            </div>

            <div className="space-y-4">
              {filteredData
                .filter(row => row._errors && row._errors.length > 0)
                .map(row => {
                  const isEditingThisRow = editingErrorRow === row._rowNumber
                  const currentData = isEditingThisRow ? editingErrorData : row

                  return (
                    <Card key={row._rowNumber} className="border-red-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base text-red-700">
                            Row {row._rowNumber} - {row._errors!.length} Error{row._errors!.length > 1 ? 's' : ''}
                          </CardTitle>
                          <div className="flex gap-2">
                            {!isEditingThisRow ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startErrorEdit(row._rowNumber)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={saveErrorEdit}
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelErrorEdit}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Error List with Approval Checkboxes */}
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm text-red-600">Validation Issues:</h5>
                          {row._errors!.map((error, errorIndex) => {
                            const errorKey = `${row._rowNumber}-${errorIndex}`
                            const isApproved = approvedErrors.has(errorKey)

                            return (
                              <div key={errorIndex} className="flex items-center space-x-2 p-2 bg-red-50 rounded">
                                <Checkbox
                                  id={errorKey}
                                  checked={isApproved}
                                  onCheckedChange={() => toggleErrorApproval(row._rowNumber, errorIndex)}
                                />
                                <label htmlFor={errorKey} className="text-sm flex-1 cursor-pointer">
                                  {error}
                                </label>
                                {isApproved && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Check className="h-3 w-3 mr-1" />
                                    Approved
                                  </Badge>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Row Data Display/Edit */}
                        <div className="space-y-3">
                          <h5 className="font-medium text-sm">Row Data:</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(currentData || {})
                              .filter(([key]) => !key.startsWith('_'))
                              .map(([key, value]) => (
                                <div key={key} className="space-y-1">
                                  <label className="text-xs font-medium text-gray-600 capitalize">
                                    {key.replace(/_/g, ' ')}
                                  </label>
                                  {isEditingThisRow ? (
                                    <Input
                                      value={value as string}
                                      onChange={(e) => {
                                        if (editingErrorData) {
                                          setEditingErrorData({
                                            ...editingErrorData,
                                            [key]: e.target.value
                                          })
                                        }
                                      }}
                                      className="text-sm"
                                      placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                                    />
                                  ) : (
                                    <div className="text-sm p-2 bg-gray-50 rounded border min-h-[36px] flex items-center">
                                      {value || <span className="text-gray-400 italic">Empty</span>}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
