'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Users, 
  Trash2,
  Copy,
  Edit
} from 'lucide-react'

interface BulkShiftOperationsProps {
  selectedShifts: string[]
  onSelectionChange: (shiftIds: string[]) => void
  onRefresh: () => void
  shifts: any[]
}

export default function BulkShiftOperations({ 
  selectedShifts, 
  onSelectionChange, 
  onRefresh,
  shifts 
}: BulkShiftOperationsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [bulkAction, setBulkAction] = useState<string>('')

  const allSelected = shifts.length > 0 && selectedShifts.length === shifts.length
  const someSelected = selectedShifts.length > 0 && selectedShifts.length < shifts.length

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([])
    } else {
      onSelectionChange(shifts.map(shift => shift.id))
    }
  }

  const handleBulkStatusUpdate = async (status: string) => {
    setLoading(true)
    try {
      const promises = selectedShifts.map(shiftId =>
        fetch(`/api/shifts/${shiftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        })
      )

      await Promise.all(promises)

      toast({
        title: "Success",
        description: `Updated ${selectedShifts.length} shift(s) to ${status}`,
      })

      onSelectionChange([])
      onRefresh()
    } catch {
      toast({
        title: "Error",
        description: "Failed to update shifts. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    setLoading(true)
    try {
      const promises = selectedShifts.map(shiftId =>
        fetch(`/api/shifts/${shiftId}`, {
          method: 'DELETE'
        })
      )

      await Promise.all(promises)

      toast({
        title: "Success",
        description: `Deleted ${selectedShifts.length} shift(s)`,
      })

      onSelectionChange([])
      onRefresh()
      setShowDeleteDialog(false)
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete shifts. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }


  if (selectedShifts.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          ref={(el) => {
            if (el) (el as any).indeterminate = someSelected
          }}
          onCheckedChange={handleSelectAll}
        />
        <span className="text-sm text-muted-foreground">
          Select shifts for bulk operations
        </span>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            ref={(el) => {
              if (el) (el as any).indeterminate = someSelected
            }}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm font-medium">
            {selectedShifts.length} shift{selectedShifts.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Bulk actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Mark as Scheduled
              </SelectItem>
              <SelectItem value="in-progress" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Mark as In Progress
              </SelectItem>
              <SelectItem value="completed" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Mark as Completed
              </SelectItem>
              <SelectItem value="cancelled" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Mark as Cancelled
              </SelectItem>
            </SelectContent>
          </Select>

          {bulkAction && (
            <Button
              onClick={() => handleBulkStatusUpdate(bulkAction)}
              disabled={loading}
              size="sm"
            >
              Apply
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast({ title: "Info", description: "Duplicate Shifts functionality is not yet implemented." })}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Shifts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: "Info", description: "Bulk Edit functionality is not yet implemented." })}>
                <Edit className="h-4 w-4 mr-2" />
                Bulk Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectionChange([])}
          >
            Clear Selection
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Shifts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedShifts.length} shift{selectedShifts.length !== 1 ? 's' : ''}? 
              This action cannot be undone and will remove all associated data including time entries and assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
