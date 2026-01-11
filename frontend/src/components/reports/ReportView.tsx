"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Loader2, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { accountService, Account } from "@/services/accounts"
import { categoryService, Category } from "@/services/categories"
import { reportService, ReportResponse } from "@/services/reports"
import { useDateRange } from "@/context/DateRangeContext"

interface ReportViewProps {
  type: 'category' | 'type'
}

const TRANSACTION_TYPES = [
  "expense",
  "withdraw",
  "income",
  "transfer"
]

export function ReportView({ type }: ReportViewProps) {
  const { date } = useDateRange()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("all")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [reportData, setReportData] = useState<ReportResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accs, cats] = await Promise.all([
          accountService.getAccounts(),
          categoryService.getCategories()
        ])
        setAccounts(accs)
        setCategories(cats)
      } catch (error) {
        console.error("Failed to fetch initial data", error)
      }
    }
    fetchData()
  }, [type])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const params: any = {
        start_date: date?.from ? format(date.from, 'yyyy-MM-dd') : undefined,
        end_date: date?.to ? format(date.to, 'yyyy-MM-dd') : undefined,
        account_id: selectedAccount === "all" ? undefined : selectedAccount,
      }

      let data;
      if (type === 'category') {
        if (selectedItems.length > 0) {
          params.category_ids = selectedItems
        }
        data = await reportService.getCategoryReport(params)
      } else {
        if (selectedItems.length > 0) {
          params.types = selectedItems
        }
        data = await reportService.getTypeReport(params)
      }
      setReportData(data)
    } catch (error) {
      console.error("Failed to fetch report", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [date, selectedAccount, selectedItems, type])

  const toggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || 'Unknown'
  }

  const getAccountName = (id: string) => {
    return accounts.find(a => a.id === id)?.name || 'Unknown'
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {type === 'category' ? 'Category Report' : 'Transaction Type Report'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{type === 'category' ? 'Categories' : 'Types'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedItems.length === 0 
                    ? "All selected" 
                    : `${selectedItems.length} selected`}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <div className="p-2 grid gap-2 max-h-[300px] overflow-y-auto">
                  {type === 'category' ? (
                    categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={category.id} 
                          checked={selectedItems.includes(category.id)}
                          onCheckedChange={() => toggleItem(category.id)}
                        />
                        <Label htmlFor={category.id}>{category.name}</Label>
                      </div>
                    ))
                  ) : (
                    TRANSACTION_TYPES.map((t) => (
                      <div key={t} className="flex items-center space-x-2">
                        <Checkbox 
                          id={t} 
                          checked={selectedItems.includes(t)}
                          onCheckedChange={() => toggleItem(t)}
                        />
                        <Label htmlFor={t} className="capitalize">{t}</Label>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(reportData.total)}
              </div>
              <p className="text-sm text-muted-foreground">
                Total for {reportData.transactions.length} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(new Date(transaction.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{transaction.name}</TableCell>
                      <TableCell>{getAccountName(transaction.account_id)}</TableCell>
                      <TableCell>
                        {transaction.category_id ? getCategoryName(transaction.category_id) : '-'}
                      </TableCell>
                      <TableCell className="capitalize">{transaction.type}</TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        transaction.amount < 0 ? "text-red-500" : "text-green-500"
                      )}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {reportData.transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
