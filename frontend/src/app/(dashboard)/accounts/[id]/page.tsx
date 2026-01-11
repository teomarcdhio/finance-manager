"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Plus } from "lucide-react"
import { accountService, Account } from "@/services/accounts"
import { transactionService, Transaction } from "@/services/transactions"
import { categoryService } from "@/services/categories"
import { authService } from "@/services/auth"
import { CreateTransactionDialog } from "@/components/transactions/CreateTransactionDialog"
import { EditTransactionDialog } from "@/components/transactions/EditTransactionDialog"
import { DeleteTransactionDialog } from "@/components/transactions/DeleteTransactionDialog"
import { AccountSettingsDialog } from "@/components/accounts/AccountSettingsDialog"
import { ImportTransactionsDialog } from "@/components/transactions/ImportTransactionsDialog"
import { BulkDeleteTransactionsDialog } from "@/components/transactions/BulkDeleteTransactionsDialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useDateRange } from "@/context/DateRangeContext"
import { format } from "date-fns"
import { reportService } from "@/services/reports"
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from "recharts"

export default function AccountPage() {
  const params = useParams()
  const accountId = params.id as string
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 100
  const { date } = useDateRange()
  const [accountsMap, setAccountsMap] = useState<Record<string, string>>({})
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({})
  const [targetAccountChartData, setTargetAccountChartData] = useState<Array<{ id: string; name: string; value: number; percentage: number }>>([])
  const [loadingTargetAccounts, setLoadingTargetAccounts] = useState(false)
  const [targetAccountsError, setTargetAccountsError] = useState<string | null>(null)
  const [categoryChartData, setCategoryChartData] = useState<Array<{ id: string; name: string; value: number; percentage: number }>>([])
  const [loadingCategoryChart, setLoadingCategoryChart] = useState(false)
  const [categoryChartError, setCategoryChartError] = useState<string | null>(null)

  const chartColors = ["#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#14B8A6", "#3B82F6", "#F97316", "#84CC16", "#F43F5E"]

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsData, destinationAccountsData, categoriesData] = await Promise.all([
          accountService.getAccounts(),
          accountService.getDestinationAccounts(),
          categoryService.getCategories()
        ])
        
        const accMap: Record<string, string> = {}
        ;[...accountsData, ...destinationAccountsData].forEach(acc => {
          accMap[acc.id] = acc.name
        })
        setAccountsMap(accMap)

        const catMap: Record<string, string> = {}
        categoriesData.forEach(cat => {
          catMap[cat.id] = cat.name
        })
        setCategoriesMap(catMap)
      } catch (error) {
        console.error("Failed to fetch data for mapping", error)
      }
    }
    fetchData()
  }, [])

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedIds(transactions.map((t) => t.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (checked: boolean | "indeterminate", id: string) => {
    if (checked === true) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
    }
  }

  const fetchAccount = async () => {
    if (accountId && authService.isAuthenticated()) {
      try {
        const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : undefined
        const data = await accountService.getAccount(accountId, endDate)
        setAccount(data)
      } catch (error) {
        console.error("Failed to fetch account", error)
      }
    }
  }

  const fetchTransactions = async () => {
    if (accountId && authService.isAuthenticated() && date?.from && date?.to) {
      try {
        const data = await transactionService.getTransactions({
          account_id: accountId,
          start_date: format(date.from, "yyyy-MM-dd"),
          end_date: format(date.to, "yyyy-MM-dd"),
          skip: (page - 1) * pageSize,
          limit: pageSize,
        })
        setTransactions(data)
      } catch (error) {
        console.error("Failed to fetch transactions", error)
      }
    }
  }

  const fetchTargetAccountExpenses = async () => {
    if (!accountId || !authService.isAuthenticated() || !date?.from || !date?.to) {
      return
    }

    try {
      setLoadingTargetAccounts(true)
      setTargetAccountsError(null)

      const limit = 500
      let skip = 0
      const totals: Record<string, number> = {}
      let hasMore = true

      while (hasMore) {
        const response = await reportService.getTypeReport({
          account_id: accountId,
          start_date: format(date.from, "yyyy-MM-dd"),
          end_date: format(date.to, "yyyy-MM-dd"),
          types: ["expense"],
          skip,
          limit,
        })

        response.transactions.forEach((txn) => {
          const targetId = txn.target_account_id ?? "unassigned"
          const amount = Math.abs(Number(txn.amount))
          totals[targetId] = (totals[targetId] ?? 0) + amount
        })

        if (response.transactions.length < limit) {
          hasMore = false
        } else {
          skip += limit
        }
      }

      const entries = Object.entries(totals)
        .map(([id, value]) => ({ id, value }))
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

      const totalValue = entries.reduce((acc, entry) => acc + entry.value, 0)

      const chartData = entries.map((entry) => {
        const name = entry.id === "unassigned" ? "Unassigned" : accountsMap[entry.id] || "Unknown"
        const percentage = totalValue > 0 ? (entry.value / totalValue) * 100 : 0
        return {
          id: entry.id,
          name,
          value: entry.value,
          percentage,
        }
      })

      setTargetAccountChartData(chartData)
    } catch (error) {
      console.error("Failed to load target account expenses", error)
      setTargetAccountsError("Failed to load target account expenses.")
      setTargetAccountChartData([])
    } finally {
      setLoadingTargetAccounts(false)
    }
  }

  const fetchCategoryBreakdown = async () => {
    if (!accountId || !authService.isAuthenticated() || !date?.from || !date?.to) {
      return
    }

    try {
      setLoadingCategoryChart(true)
      setCategoryChartError(null)

      const limit = 500
      let skip = 0
      const totals: Record<string, number> = {}
      let hasMore = true

      while (hasMore) {
        const response = await transactionService.getTransactions({
          account_id: accountId,
          start_date: format(date.from, "yyyy-MM-dd"),
          end_date: format(date.to, "yyyy-MM-dd"),
          skip,
          limit,
        })

        response.forEach((txn) => {
          const categoryId = txn.category_id ?? "uncategorized"
          const amount = Math.abs(Number(txn.amount))
          totals[categoryId] = (totals[categoryId] ?? 0) + amount
        })

        if (response.length < limit) {
          hasMore = false
        } else {
          skip += limit
        }
      }

      const entries = Object.entries(totals)
        .map(([id, value]) => ({ id, value }))
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

      const totalValue = entries.reduce((acc, entry) => acc + entry.value, 0)

      const chartData = entries.map((entry) => {
        const name = entry.id === "uncategorized" ? "Uncategorized" : categoriesMap[entry.id] || "Unknown"
        const percentage = totalValue > 0 ? (entry.value / totalValue) * 100 : 0
        return {
          id: entry.id,
          name,
          value: entry.value,
          percentage,
        }
      })

      setCategoryChartData(chartData)
    } catch (error) {
      console.error("Failed to load category breakdown", error)
      setCategoryChartError("Failed to load category breakdown.")
      setCategoryChartData([])
    } finally {
      setLoadingCategoryChart(false)
    }
  }

  useEffect(() => {
    fetchAccount()
  }, [accountId, date])

  // Reset page when date range changes
  useEffect(() => {
    setPage(1)
  }, [date])

  useEffect(() => {
    fetchTransactions()
  }, [accountId, date, page])

  useEffect(() => {
    fetchTargetAccountExpenses()
  }, [accountId, date, accountsMap])

  useEffect(() => {
    fetchCategoryBreakdown()
  }, [accountId, date, categoriesMap])

  if (!account) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 space-y-8">
      {/* Row 1: Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{account.name}</h1>
          <div className="mt-1 text-muted-foreground">
            <p className="flex items-center gap-2">
              {account.bank_name}
              {account.account_number && (
                <>
                  <span>•</span>
                  <span className="font-mono">{account.account_number}</span>
                </>
              )}
            </p>
            <p className="text-2xl font-bold text-foreground mt-2">
              Balance: {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(account.current_balance)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <BulkDeleteTransactionsDialog
              selectedIds={selectedIds}
              onTransactionsDeleted={() => {
                setSelectedIds([])
                fetchTransactions()
                fetchAccount()
              }}
            />
          )}
          <AccountSettingsDialog 
            account={account} 
            onAccountUpdated={fetchAccount} 
          />
          <ImportTransactionsDialog 
            accountId={accountId}
            onImportSuccess={() => {
              fetchTransactions()
              fetchAccount()
            }}
          />
          <CreateTransactionDialog 
            defaultAccountId={accountId}
            onTransactionCreated={() => {
              // TODO: Refresh transactions list
              window.location.reload() // Temporary simple refresh
            }}
          />
        </div>
      </div>

      {/* Row 2: Graphs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Target Accounts (Expense)</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {loadingTargetAccounts ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading target accounts...
              </div>
            ) : targetAccountsError ? (
              <div className="h-full flex items-center justify-center text-sm text-destructive">
                {targetAccountsError}
              </div>
            ) : targetAccountChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No expense transactions with target accounts for the selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={targetAccountChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {targetAccountChartData.map((entry, index) => (
                      <Cell key={entry.id} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name, payload) => {
                      const percentage = payload?.payload?.percentage ?? 0
                      const formattedValue = new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: account.currency || "USD",
                      }).format(value)
                      return [`${formattedValue} (${percentage.toFixed(1)}%)`, payload?.payload?.name]
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value) => value as string}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {loadingCategoryChart ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading categories...
              </div>
            ) : categoryChartError ? (
              <div className="h-full flex items-center justify-center text-sm text-destructive">
                {categoryChartError}
              </div>
            ) : categoryChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No transactions for the selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={entry.id} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name, payload) => {
                      const percentage = payload?.payload?.percentage ?? 0
                      const formattedValue = new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: account.currency || "USD",
                      }).format(value)
                      return [`${formattedValue} (${percentage.toFixed(1)}%)`, payload?.payload?.name]
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value) => value as string}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={transactions.length > 0 && selectedIds.length === transactions.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Target Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(transaction.id)}
                      onCheckedChange={(checked: boolean | "indeterminate") => handleSelectOne(checked, transaction.id)}
                    />
                  </TableCell>
                  <TableCell>{format(new Date(transaction.date), "dd-MM-yyyy")}</TableCell>
                  <TableCell>{transaction.name}</TableCell>
                  <TableCell>{transaction.target_account_id ? accountsMap[transaction.target_account_id] || 'Unknown' : '-'}</TableCell>
                  <TableCell className="capitalize">{transaction.type}</TableCell>
                  <TableCell>{transaction.category_id ? categoriesMap[transaction.category_id] || 'Unknown' : '-'}</TableCell>
                  <TableCell className={`text-right ${transaction.amount > 0 ? 'text-green-600' : ''}`}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(transaction.amount)}
                  </TableCell>
                  <TableCell className="flex items-center justify-end gap-2">
                    <EditTransactionDialog 
                      transaction={transaction} 
                      onTransactionUpdated={() => {
                        fetchTransactions()
                        fetchAccount()
                      }} 
                    />
                    <DeleteTransactionDialog 
                      transaction={transaction} 
                      onTransactionDeleted={() => {
                        fetchTransactions()
                        fetchAccount()
                      }} 
                    />
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No transactions found for the selected period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {page}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={transactions.length < pageSize}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
