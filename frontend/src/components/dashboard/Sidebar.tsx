"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  ChevronDown, 
  ChevronRight, 
  CreditCard, 
  LogOut, 
  Settings, 
  User, 
  Wallet,
  Landmark,
  Tags,
  BarChart3
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { accountService, Account } from "@/services/accounts"
import { authService } from "@/services/auth"

export function Sidebar() {
  const [isAccountsOpen, setIsAccountsOpen] = useState(true)
  const [isReportsOpen, setIsReportsOpen] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        if (authService.isAuthenticated()) {
          const data = await accountService.getAccounts()
          setAccounts(data)
        }
      } catch (error) {
        console.error("Failed to fetch accounts", error)
      }
    }
    fetchAccounts()
  }, [])

  const handleLogout = () => {
    authService.logout()
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      {/* Logo Area */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Wallet className="h-6 w-6" />
          <span>Finance Manager</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-1 px-2">
          <Button
            variant="ghost"
            className="justify-between w-full"
            onClick={() => setIsAccountsOpen(!isAccountsOpen)}
          >
            <span className="flex items-center">
              <CreditCard className="mr-2 h-4 w-4" />
              Accounts
            </span>
            {isAccountsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          
          {isAccountsOpen && (
            <div className="grid gap-1 pl-6">
              {accounts.map((account) => (
                <Button
                  key={account.id}
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  asChild
                >
                  <Link href={`/accounts/${account.id}`}>
                    {account.name}
                  </Link>
                </Button>
              ))}
            </div>
          )}
          
          <Button
            variant="ghost"
            className="justify-between w-full"
            onClick={() => setIsReportsOpen(!isReportsOpen)}
          >
            <span className="flex items-center">
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </span>
            {isReportsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          
          {isReportsOpen && (
            <div className="grid gap-1 pl-6">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start font-normal"
                asChild
              >
                <Link href="/reports/category">
                  By Category
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start font-normal"
                asChild
              >
                <Link href="/reports/type">
                  By Type
                </Link>
              </Button>
            </div>
          )}

          <Button variant="ghost" className="justify-start w-full" asChild>
            <Link href="/destination-accounts">
              <Landmark className="mr-2 h-4 w-4" />
              Destination Accounts
            </Link>
          </Button>

          <Button variant="ghost" className="justify-start w-full" asChild>
            <Link href="/categories">
              <Tags className="mr-2 h-4 w-4" />
              Categories
            </Link>
          </Button>

          <Button variant="ghost" className="justify-start">
            <User className="mr-2 h-4 w-4" />
            User Management
          </Button>
        </nav>
      </div>

      {/* User Menu (Bottom) */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start pl-0 hover:bg-transparent">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="@username" />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-medium">Admin User</span>
                  <span className="text-xs text-muted-foreground">admin@example.com</span>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer w-full flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
