"use client"

import { DatePickerWithRange } from "./DateRangePicker"

export function Header() {
  return (
    <header className="flex h-14 items-center justify-end gap-4 border-b bg-background px-6">
      <DatePickerWithRange />
    </header>
  )
}
