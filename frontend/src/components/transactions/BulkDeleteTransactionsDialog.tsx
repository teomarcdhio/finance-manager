"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { transactionService } from "@/services/transactions"

interface BulkDeleteTransactionsDialogProps {
  selectedIds: string[]
  onTransactionsDeleted: () => void
  onOpenChange?: (open: boolean) => void
}

export function BulkDeleteTransactionsDialog({ 
  selectedIds,
  onTransactionsDeleted,
  onOpenChange
}: BulkDeleteTransactionsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const onDelete = async () => {
    try {
      setLoading(true)
      await transactionService.bulkDeleteTransactions(selectedIds)
      handleOpenChange(false)
      onTransactionsDeleted()
    } catch (error) {
      console.error("Failed to delete transactions", error)
    } finally {
      setLoading(false)
    }
  }

  if (selectedIds.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete ({selectedIds.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Transactions</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {selectedIds.length} transactions? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={onDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
