"use client"

import { useEffect, useState } from "react"
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
import { DeleteDestinationAccountDialog } from "@/components/accounts/DeleteDestinationAccountDialog"

export default function DestinationAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const data = await accountService.getDestinationAccounts()
      setAccounts(data)
    } catch (error) {
      console.error("Failed to fetch accounts", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Destination Accounts</h2>
        <div className="flex items-center space-x-2">
          <DestinationAccountDialog onSuccess={fetchAccounts} />
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No accounts found</TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{account.bank_name}</TableCell>
                    <TableCell>{account.account_number || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <DestinationAccountDialog account={account} onSuccess={fetchAccounts} />
                        <DeleteDestinationAccountDialog account={account} onSuccess={fetchAccounts} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
