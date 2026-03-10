"use client"

import { Button } from "@/components/ui/button"
import { FilterIcon, ShieldIcon, MusicIcon, XIcon, Search as SearchIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  isAdmin: boolean
  showFilters: boolean
  showAdmin: boolean
  adminEnabled: boolean
  onToggleFilters: () => void
  onToggleAdmin: () => void
  filterCount: number
  query: string
  onQueryChange: (query: string) => void
  monthsLabel?: string
}

export function Header({
  isAdmin,
  showFilters,
  showAdmin,
  adminEnabled,
  onToggleFilters,
  onToggleAdmin,
  filterCount,
  query,
  onQueryChange,
  monthsLabel,
}: HeaderProps) {
  const [isSearchActive, setIsSearchActive] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchActive])

  // Fix: Close search when clicking outside if query is empty
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSearchActive && 
        !query && 
        headerRef.current && 
        !headerRef.current.contains(event.target as Node)
      ) {
        setIsSearchActive(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isSearchActive, query])

  return (
    <header 
      ref={headerRef}
      className="pointer-events-none fixed top-0 right-0 left-0 z-20 flex items-center justify-between gap-2 px-4 py-3"
    >
      <div className="pointer-events-auto flex flex-1 items-center gap-2 overflow-hidden">
        <AnimatePresence mode="wait">
          {!isSearchActive && !query ? (
            <motion.div
              key="logo"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center pointer-events-auto shrink-0"
            >
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="h-9 w-9 object-contain brightness-100" 
              />
            </motion.div>
          ) : (
            <motion.div
              key="search"
              initial={{ width: 40, opacity: 0 }}
              animate={{ width: "100%", opacity: 1 }}
              exit={{ width: 40, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center gap-2 rounded-lg bg-background/80 px-3 py-1.5 shadow-lg backdrop-blur-md"
            >
              <SearchIcon className="h-4 w-4 text-primary shrink-0" />
              <input
                ref={searchInputRef}
                autoFocus
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onBlur={() => !query && setIsSearchActive(false)}
                placeholder="Артист или площадка"
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground py-1"
              />
              {query && (
                <button
                  onClick={() => {
                    onQueryChange("")
                    setIsSearchActive(false)
                  }}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notch Month Label - Centered */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none">
        <AnimatePresence>
          {!isSearchActive && monthsLabel && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="px-6 py-1.5 rounded-b-[20px] bg-background shadow-2xl flex items-center justify-center border-x border-b border-border/5"
            >
              <span className="text-[10px] font-bold tracking-[0.1em] text-foreground/80">
                {monthsLabel}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-auto flex items-center gap-2 shrink-0">
        {!isSearchActive && !query && (
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsSearchActive(true)}
            className="rounded-lg bg-background/80 text-foreground shadow-lg backdrop-blur-md"
          >
            <SearchIcon className="h-4 w-4" />
          </Button>
        )}
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
