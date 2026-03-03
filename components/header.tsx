"use client"

import { Button } from "@/components/ui/button"
import { FilterIcon, ShieldIcon, MusicIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  isAdmin: boolean
  showFilters: boolean
  showAdmin: boolean
  adminEnabled: boolean
  onToggleFilters: () => void
  onToggleAdmin: () => void
  filterCount: number
}

export function Header({
  isAdmin,
  showFilters,
  showAdmin,
  adminEnabled,
  onToggleFilters,
  onToggleAdmin,
  filterCount,
}: HeaderProps) {
  return (
    <header className="pointer-events-none fixed top-0 right-0 left-0 z-20 flex items-center justify-between gap-4 px-4 py-3">
      <div className="pointer-events-auto flex items-center gap-2 rounded-lg bg-background/80 px-3 py-2 shadow-lg backdrop-blur-md">
        <MusicIcon className="h-5 w-5 text-primary" />
        <h1 className="text-sm font-bold tracking-tight text-foreground">
          Moscow Concerts
        </h1>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <Button
          variant={showFilters ? "default" : "secondary"}
          size="sm"
          onClick={onToggleFilters}
          className={cn(
            "relative gap-1.5 rounded-lg shadow-lg hidden sm:inline-flex",
            showFilters
              ? "bg-primary text-primary-foreground"
              : "bg-background/80 text-foreground backdrop-blur-md"
          )}
        >
          {showFilters ? (
            <XIcon className="h-4 w-4" />
          ) : (
            <FilterIcon className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Фильтры</span>
          {filterCount > 0 && !showFilters && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {filterCount}
            </span>
          )}
        </Button>

        {adminEnabled && (
          <Button
            variant={showAdmin ? "default" : "secondary"}
            size="sm"
            onClick={onToggleAdmin}
            className={cn(
              "gap-1.5 rounded-lg shadow-lg",
              showAdmin
                ? "bg-primary text-primary-foreground"
                : isAdmin
                  ? "bg-primary/20 text-primary backdrop-blur-md"
                  : "bg-background/80 text-foreground backdrop-blur-md"
            )}
          >
            <ShieldIcon className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isAdmin ? "Админ" : "Войти"}
            </span>
          </Button>
        )}
      </div>
    </header>
  )
}
