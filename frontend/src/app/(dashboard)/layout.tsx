import { Sidebar } from "@/components/dashboard/Sidebar"
import { Header } from "@/components/dashboard/Header"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { DateRangeProvider } from "@/context/DateRangeContext"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <DateRangeProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
              {children}
            </main>
          </div>
        </div>
      </DateRangeProvider>
    </AuthGuard>
  )
}


