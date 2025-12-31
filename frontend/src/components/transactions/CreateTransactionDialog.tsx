"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { accountService, Account } from "@/services/accounts"
import { transactionService } from "@/services/transactions"

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["payment", "withdraw", "deposit", "interest", "transfer"]),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) !== 0, {
    message: "Amount must be a valid non-zero number",
  }),
  target_account: z.string().min(2, "Target account must be at least 2 characters"),
  account_id: z.string().uuid("Please select an account"),
  date: z.date({
    required_error: "A date is required",
  }),
})

interface CreateTransactionDialogProps {
  defaultAccountId?: string
  onTransactionCreated?: () => void
}

export function CreateTransactionDialog({ 
  defaultAccountId,
  onTransactionCreated 
}: CreateTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "payment",
      amount: "",
      target_account: "",
      account_id: defaultAccountId || "",
      date: new Date(),
    },
  })

  // Update default account ID when prop changes
  useEffect(() => {
    if (defaultAccountId) {
      form.setValue("account_id", defaultAccountId)
    }
  }, [defaultAccountId, form])

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await accountService.getAccounts()
        setAccounts(data)
      } catch (error) {
        console.error("Failed to fetch accounts", error)
      }
    }
    if (open) {
      fetchAccounts()
    }
  }, [open])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true)
      await transactionService.createTransaction({
        ...values,
        amount: Number(values.amount),
        date: format(values.date, "yyyy-MM-dd"),
      })
      setOpen(false)
      form.reset()
      if (onTransactionCreated) {
        onTransactionCreated()
      }
    } catch (error) {
      console.error("Failed to create transaction", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Transaction</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Grocery Store" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="payment">Payment</SelectItem>
                        <SelectItem value="withdraw">Withdraw</SelectItem>
                        <SelectItem value="deposit">Deposit</SelectItem>
                        <SelectItem value="interest">Interest</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_account"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target / Payee</FormLabel>
                  <FormControl>
                    <Input placeholder="Target account or payee" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Transaction
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
