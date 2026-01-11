"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Download, Loader2, User as UserIcon, AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { exportService } from "@/services/export"
import { importService } from "@/services/import"
import { authService, User } from "@/services/auth"
import { accountService, Account } from "@/services/accounts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateAccountDialog } from "@/components/accounts/CreateAccountDialog"

export default function SettingsPage() {
  const [downloading, setDownloading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  
  // Password update state
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await authService.getMe()
        setUser(userData)
      } catch (error) {
        console.error("Failed to fetch user", error)
      }
    }
    fetchUser()
  }, [])

  const fetchAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true)
      setAccountsError(null)
      const data = await accountService.getAccounts()
      setAccounts(data)
    } catch (error) {
      console.error("Failed to fetch accounts", error)
      setAccountsError("Unable to load your accounts. Please try again.")
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    
    if (password.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters long.' })
      return
    }

    try {
      setUpdatingPassword(true)
      setPasswordMessage(null)
      const updatedUser = await authService.updateMe({ password })
      setUser(updatedUser)
      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' })
      setPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error("Failed to update password", error)
      const msg = error.response?.data?.detail || "Failed to update password.";
      setPasswordMessage({ type: 'error', text: msg })
    } finally {
      setUpdatingPassword(false)
    }
  }

  const handleBackup = async () => {
    try {
      setDownloading(true)
      await exportService.downloadBackup()
    } catch (error) {
      console.error("Failed to download backup", error)
    } finally {
      setDownloading(false)
    }
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.zip')) {
      setRestoreMessage({ type: 'error', text: 'Please upload a valid ZIP file.' })
      return
    }

    try {
      setRestoring(true)
      setRestoreMessage(null)
      const result = await importService.restoreBackup(file)
      console.log("Restore result:", result)
      setRestoreMessage({ 
        type: 'success', 
        text: `Restore successful! Processed ${result.counts.categories} categories, ${result.counts.accounts} accounts, and ${result.counts.transactions} transactions.` 
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error: any) {
      console.error("Failed to restore backup", error)
      const msg = error.response?.data?.detail || "Failed to restore backup. Please check the file format.";
      setRestoreMessage({ type: 'error', text: msg })
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h3 className="text-lg font-medium">Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your app preferences and data.
        </p>
      </div>
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Your user information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <UserIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">{user?.username}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground uppercase">{user?.permission}</p>
                </div>
              </div>

              {user?.is_default_password && (
                <div className="space-y-2">
                  <h4 className="text-md font-medium">Update Password</h4>
                  <p className="text-sm text-muted-foreground">
                    Ensure your account is using a strong, secure password.
                  </p>
                  
                  <div className="grid gap-2">
                    <Input 
                      type="password" 
                      placeholder="New password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={updatingPassword}
                    />
                    <Input 
                      type="password" 
                      placeholder="Confirm new password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={updatingPassword}
                    />
                  </div>

                  <Button onClick={handleUpdatePassword} disabled={updatingPassword}>
                    {updatingPassword ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Update Password"
                    )}
                  </Button>

                  {passwordMessage && (
                    <Alert variant={passwordMessage.type === 'error' ? "destructive" : "default"} className={passwordMessage.type === 'success' ? "border-green-500 text-green-700 bg-green-50" : ""}>
                       {passwordMessage.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      <AlertTitle>{passwordMessage.type === 'error' ? "Error" : "Success"}</AlertTitle>
                      <AlertDescription>
                        {passwordMessage.text}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5 space-y-2">
                <Input 
                  type="password" 
                  placeholder="New Password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <Input 
                  type="password" 
                  placeholder="Confirm New Password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
              </div>
              
              <Button onClick={handleUpdatePassword} disabled={updatingPassword || !password || !confirmPassword}>
                {updatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>

              {passwordMessage && (
                <Alert variant={passwordMessage.type === 'error' ? "destructive" : "default"} className={passwordMessage.type === 'success' ? "border-green-500 text-green-700 bg-green-50" : ""}>
                   {passwordMessage.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  <AlertTitle>{passwordMessage.type === 'error' ? "Error" : "Success"}</AlertTitle>
                  <AlertDescription>
                    {passwordMessage.text}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Backup</CardTitle>
              <CardDescription>
                Export all your data (Transactions, Accounts, Categories) as a ZIP archive containing CSV files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleBackup} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download Backup
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Restore Data</CardTitle>
              <CardDescription>
                Restore your data from a backup ZIP file. 
                <span className="block text-red-500 font-medium mt-1">Warning: This will add missing records and update existing ones. It does NOT delete existing data that isn't in the backup.</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Input 
                  ref={fileInputRef}
                  id="backup-file" 
                  type="file" 
                  accept=".zip" 
                  onChange={handleRestore}
                  disabled={restoring} 
                />
              </div>
              
              {restoring && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring data... this might take a moment.
                </div>
              )}

              {restoreMessage && (
                <Alert variant={restoreMessage.type === 'error' ? "destructive" : "default"} className={restoreMessage.type === 'success' ? "border-green-500 text-green-700 bg-green-50" : ""}>
                   {restoreMessage.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  <AlertTitle>{restoreMessage.type === 'error' ? "Error" : "Success"}</AlertTitle>
                  <AlertDescription>
                    {restoreMessage.text}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 space-y-0 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>User Accounts</CardTitle>
                <CardDescription>Manage the financial accounts linked to your user profile.</CardDescription>
              </div>
              <CreateAccountDialog onSuccess={fetchAccounts} />
            </CardHeader>
            <CardContent className="space-y-4">
              {accountsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{accountsError}</AlertDescription>
                </Alert>
              )}

              {loadingAccounts ? (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading accounts...
                </div>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No accounts found for your user. Create one to start tracking balances.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Account #</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead className="text-right">Current Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>{account.bank_name || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{account.account_number || '—'}</TableCell>
                          <TableCell>{account.currency || 'USD'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(account.current_balance || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {user?.is_default_password && (
        <Card className="border-red-200 bg-red-50 mt-8">
            <CardHeader>
              <CardTitle className="text-red-700">Security Warning: Default Password Detected</CardTitle>
              <CardDescription className="text-red-600">
                You are currently using the default password ({`'admin'`}). Please update it immediately to secure your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5 space-y-2">
                <Input 
                  type="password" 
                  placeholder="New Password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white" 
                />
                <Input 
                  type="password" 
                  placeholder="Confirm New Password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="bg-white"
                />
              </div>
              
              <Button 
                onClick={handleUpdatePassword} 
                disabled={updatingPassword || !password || !confirmPassword}
                variant="destructive"
              >
                {updatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>

              {passwordMessage && (
                <Alert variant={passwordMessage.type === 'error' ? "destructive" : "default"} className={passwordMessage.type === 'success' ? "border-green-500 text-green-700 bg-green-50" : "bg-white border-red-200"}>
                   {passwordMessage.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  <AlertTitle>{passwordMessage.type === 'error' ? "Error" : "Success"}</AlertTitle>
                  <AlertDescription>
                    {passwordMessage.text}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
      )}
    </div>
  )
}
