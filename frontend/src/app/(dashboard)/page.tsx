"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { accountService, Account } from "@/services/accounts"
import { transactionService, Transaction } from "@/services/transactions"
import { authService } from "@/services/auth"

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [netWorthByCurrency, setNetWorthByCurrency] = useState<Record<string, number>>({})
  const [monthlyExpensesByCurrency, setMonthlyExpensesByCurrency] = useState<Record<string, number>>({})
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (authService.isAuthenticated()) {
          // Fetch Accounts
          const accountsData = await accountService.getAccounts()
          setAccounts(accountsData)
          
          const totals: Record<string, number> = {}
          accountsData.forEach(account => {
            const currency = account.currency || 'USD'
            totals[currency] = (totals[currency] || 0) + Number(account.current_balance || 0)
          })
          setNetWorthByCurrency(totals)

          // Fetch Transactions for Monthly Expenses
          const now = new Date()
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
          
          const transactionsData = await transactionService.getTransactions({
            start_date: startOfMonth,
            end_date: endOfMonth
          })

          // Calculate Expenses
          const accountCurrencyMap = new Map(accountsData.map(a => [a.id, a.currency || 'USD']))
          const expenses: Record<string, number> = {}
          transactionsData.forEach(t => {
            if (Number(t.amount) < 0) {
               const currency = accountCurrencyMap.get(t.account_id) || 'USD'
               expenses[currency] = (expenses[currency] || 0) + Math.abs(Number(t.amount))
            }
          })
          setMonthlyExpensesByCurrency(expenses)

          // Fetch Recent Transactions (last 5)
          const recentData = await transactionService.getTransactions({ limit: 5 })
          setRecentTransactions(recentData)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net Worth</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(netWorthByCurrency).map(([currency, amount]) => (
                <div key={currency} className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)}
                </div>
              ))}
              {Object.keys(netWorthByCurrency).length === 0 && (
                 <div className="text-2xl font-bold">$0.00</div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Current Balance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
                    <CardContent>
            <div className="space-y-1">
              {Object.entries(monthlyExpensesByCurrency).map(([currency, amount]) => (
                <div key={currency} className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)}
                </div>
              ))}
              {Object.keys(monthlyExpensesByCurrency).length === 0 && (
                 <div className="text-2xl font-bold">$0.00</div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              +180.1% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Accounts Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{account.name}</p>
                    <p className="text-sm text-muted-foreground">{account.bank_name}</p>
                  </div>
                  <div className="font-medium">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(account.current_balance)}
                  </div>
                </div>
              ))}
              {accounts.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No accounts found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{transaction.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.type}
                    </p>
                  </div>
                  <div className={`ml-auto font-medium ${transaction.amount > 0 ? 'text-green-600' : ''}`}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(transaction.amount)}
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No recent transactions
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
