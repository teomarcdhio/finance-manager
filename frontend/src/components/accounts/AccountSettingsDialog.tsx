"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { accountService, Account } from "@/services/accounts"

const CURRENCIES = [
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" },
  { value: "JPY", label: "Japanese Yen (¥)" },
  { value: "CAD", label: "Canadian Dollar (C$)" },
  { value: "AUD", label: "Australian Dollar (A$)" },
  { value: "CHF", label: "Swiss Franc (Fr)" },
  { value: "CNY", label: "Chinese Yuan (¥)" },
  { value: "INR", label: "Indian Rupee (₹)" },
]

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  bank_name: z.string().min(2, "Bank name must be at least 2 characters"),
  account_number: z.string().optional(),
  initial_balance: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Initial balance must be a valid number",
  }),
  currency: z.string(),
})

interface AccountSettingsDialogProps {
  account: Account
  onAccountUpdated: () => void
}

export function AccountSettingsDialog({ 
  account,
  onAccountUpdated 
}: AccountSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: account.name,
      bank_name: account.bank_name || "",
      account_number: account.account_number || "",
      initial_balance: account.initial_balance.toString(),
      currency: account.currency || "USD",
    },
  })

  // Reset form when account changes
  useEffect(() => {
    form.reset({
      name: account.name,
      bank_name: account.bank_name,
      account_number: account.account_number || "",
      initial_balance: account.initial_balance.toString(),
      currency: account.currency || "USD",
    })
  }, [account, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true)
      await accountService.updateAccount(account.id, {
        ...values,
        initial_balance: Number(values.initial_balance),
      })
      setOpen(false)
      onAccountUpdated()
    } catch (error) {
      console.error("Failed to update account", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Main Checking" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bank_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Chase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="account_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="****1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initial_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Balance</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
