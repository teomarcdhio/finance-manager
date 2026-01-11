"use client"

import { useEffect, useState, useCallback } from "react"
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
import { DestinationAccountDialog } from "@/components/accounts/DestinationAccountDialog"
import { ImportDestinationAccountsDialog } from "@/components/accounts/ImportDestinationAccountsDialog"
import { DeleteDestinationAccountDialog } from "@/components/accounts/DeleteDestinationAccountDialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useDateRange } from "@/context/DateRangeContext"
import { format } from "date-fns"
import { transactionService } from "@/services/transactions"

type BalanceState = {
  value?: number
  loading?: boolean
  error?: string
}

export default function DestinationAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [balances, setBalances] = useState<Record<string, BalanceState>>({})
  const { date } = useDateRange()

  const refreshAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const data = await accountService.getDestinationAccounts()
      setAccounts(data)
    } catch (error) {
      console.error("Failed to fetch destination accounts", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAccounts()
  }, [refreshAccounts])

  useEffect(() => {
    // Reset previously fetched balances when the date range changes
    setBalances({})
  }, [date])

  const handleShowBalance = async (account: Account) => {
    const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : undefined
    const endBoundary = date?.to ?? date?.from
    const endDate = endBoundary ? format(endBoundary, "yyyy-MM-dd") : undefined
    const pageSize = 500

    setBalances((prev) => ({
      ...prev,
      [account.id]: { value: prev[account.id]?.value, loading: true, error: undefined },
    }))

    try {
      let skip = 0
      let total = 0
      let fetchedAll = false

      while (!fetchedAll) {
        const transactions = await transactionService.getTransactions({
          start_date: startDate,
          end_date: endDate,
          skip,
          limit: pageSize,
        })

        transactions.forEach((txn) => {
          if (txn.target_account_id === account.id) {
            total += Number(txn.amount)
          }
        })

        if (transactions.length < pageSize) {
          fetchedAll = true
        } else {
          skip += pageSize
        }
      }

      const balanceValue = Number(account.initial_balance ?? 0) + total

      setBalances((prev) => ({
        ...prev,
        [account.id]: { value: balanceValue, loading: false, error: undefined },
      }))
    } catch (error) {
      console.error("Failed to calculate destination account balance", error)
      setBalances((prev) => ({
        ...prev,
        [account.id]: { value: prev[account.id]?.value, loading: false, error: "Failed to load balance" },
      }))
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Destination Accounts</h2>
        <div className="flex items-center space-x-2">
          <ImportDestinationAccountsDialog onImportSuccess={refreshAccounts} />
          <DestinationAccountDialog onSuccess={refreshAccounts} />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Bank Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No accounts found</TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => {
                  const balanceState = balances[account.id]
                  const isLoading = Boolean(balanceState?.loading)
                  const hasValue = typeof balanceState?.value === "number"

                  return (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>{account.bank_name}</TableCell>
                      <TableCell>{account.account_number || "-"}</TableCell>
                      <TableCell className="text-right">
                        {hasValue ? (
                          <div className="flex items-center justify-end gap-2">
                            <span>
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: account.currency || "USD",
                              }).format(balanceState?.value ?? 0)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleShowBalance(account)}
                              disabled={isLoading}
                            >
                              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowBalance(account)}
                            disabled={isLoading}
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Show"}
                          </Button>
                        )}
                        {balanceState?.error && (
                          <div className="mt-1 text-xs text-destructive">
                            {balanceState.error}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <DestinationAccountDialog account={account} onSuccess={refreshAccounts} />
                          <DeleteDestinationAccountDialog account={account} onSuccess={refreshAccounts} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
