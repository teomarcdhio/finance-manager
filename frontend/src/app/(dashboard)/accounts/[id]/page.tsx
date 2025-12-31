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
import { Plus } from "lucide-react"
import { accountService, Account } from "@/services/accounts"
import { transactionService, Transaction } from "@/services/transactions"
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

export default function AccountPage() {
  const params = useParams()
  const accountId = params.id as string
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 100
  const { date } = useDateRange()

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
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(account.current_balance)}
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
            <CardTitle>Target Accounts %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center bg-muted/20 rounded-md">
              Pie Chart Placeholder
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transactions by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center bg-muted/20 rounded-md">
              Bar Chart Placeholder
            </div>
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
                  <TableCell className="capitalize">{transaction.type}</TableCell>
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
