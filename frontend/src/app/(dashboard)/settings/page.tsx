"use client"

import { useState, useEffect, useRef } from "react"
import { Download, Loader2, User as UserIcon, Upload, AlertCircle, CheckCircle2 } from "lucide-react"

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

export default function SettingsPage() {
  const [downloading, setDownloading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      </Tabs>
    </div>
  )
}
