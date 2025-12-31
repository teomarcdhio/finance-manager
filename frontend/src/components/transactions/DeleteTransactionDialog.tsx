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
import { transactionService, Transaction } from "@/services/transactions"
import { format } from "date-fns"

interface DeleteTransactionDialogProps {
  transaction: Transaction
  onTransactionDeleted: () => void
}

export function DeleteTransactionDialog({ 
  transaction,
  onTransactionDeleted 
}: DeleteTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const onDelete = async () => {
    try {
      setLoading(true)
      await transactionService.deleteTransaction(transaction.id)
      setOpen(false)
      onTransactionDeleted()
    } catch (error) {
      console.error("Failed to delete transaction", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Transaction</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this transaction? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-2 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-muted-foreground">Date:</span>
            <span className="col-span-2">{format(new Date(transaction.date), "PPP")}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-muted-foreground">Description:</span>
            <span className="col-span-2">{transaction.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-muted-foreground">Amount:</span>
            <span className="col-span-2 font-medium">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(transaction.amount)}
            </span>
          </div>
        </div>

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
