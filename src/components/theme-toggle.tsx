'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-2 px-2 py-1.5 h-8 text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <Sun className="h-4 w-4 shrink-0 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-primary" />
      <Moon className="absolute h-4 w-4 shrink-0 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-yellow-400" />
      <span className="group-data-[collapsible=icon]:hidden text-sm">
        {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
