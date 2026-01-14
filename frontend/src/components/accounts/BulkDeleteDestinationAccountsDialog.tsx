"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { accountService } from "@/services/accounts"

interface BulkDeleteDestinationAccountsDialogProps {
  selectedIds: string[]
  onDeleted: () => void
  onOpenChange?: (open: boolean) => void
}

export function BulkDeleteDestinationAccountsDialog({
  selectedIds,
  onDeleted,
  onOpenChange,
}: BulkDeleteDestinationAccountsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
  }

  const handleDelete = async () => {
    try {
      setLoading(true)
      await accountService.bulkDeleteDestinationAccounts(selectedIds)
      handleOpenChange(false)
      onDeleted()
    } catch (error) {
      console.error("Failed to delete destination accounts", error)
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
          <DialogTitle>Delete Destination Accounts</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {selectedIds.length} destination account{selectedIds.length === 1 ? "" : "s"}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
