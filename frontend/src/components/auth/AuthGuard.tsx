"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/services/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login")
    } else {
      // Avoid calling setState synchronously in effect
      setTimeout(() => setAuthorized(true), 0)
    }
  }, [router])

  if (!authorized) {
    return null // or a loading spinner
  }

  return <>{children}</>
}
