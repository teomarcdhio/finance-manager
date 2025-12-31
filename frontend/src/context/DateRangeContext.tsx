"use client"

import React, { createContext, useContext, useState } from "react"
import { DateRange } from "react-day-picker"
import { subDays } from "date-fns"

interface DateRangeContextType {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined)

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  return (
    <DateRangeContext.Provider value={{ date, setDate }}>
      {children}
    </DateRangeContext.Provider>
  )
}

export function useDateRange() {
  const context = useContext(DateRangeContext)
  if (context === undefined) {
    throw new Error("useDateRange must be used within a DateRangeProvider")
  }
  return context
}
