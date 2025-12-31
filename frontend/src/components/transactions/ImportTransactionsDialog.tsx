"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Upload, FileUp } from "lucide-react"

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { transactionService } from "@/services/transactions"

const formSchema = z.object({
  file: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, "File is required")
    .refine((files) => files[0]?.type === "text/csv", "File must be a CSV"),
})

interface ImportTransactionsDialogProps {
  accountId?: string
  onImportSuccess: () => void
}

export function ImportTransactionsDialog({ 
  accountId,
  onImportSuccess 
}: ImportTransactionsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      
      const file = values.file[0]
      const result = await transactionService.importTransactions(file, accountId)
      
      if (result.status === "error") {
        setError(result.message + (result.errors ? ": " + result.errors.join(", ") : ""))
      } else {
        setSuccess(result.message)
        setTimeout(() => {
          setOpen(false)
          onImportSuccess()
          form.reset()
          setSuccess(null)
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || "Failed to import transactions")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import transactions. 
            {accountId && " They will be added to the current account."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>CSV File</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      accept=".csv"
                      onChange={(e) => {
                        onChange(e.target.files)
                      }}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {error && (
              <div className="text-sm font-medium text-destructive break-words">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm font-medium text-green-600">
                {success}
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
