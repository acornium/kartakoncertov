"use client"

import { Button } from "@/components/ui/button"
import { FilterIcon, ShieldIcon, MusicIcon, XIcon, Search as SearchIcon } from "lucide-react"
import Image from "next/image"
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
  isSearchActive: boolean
  onSearchActiveChange: (active: boolean) => void
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
  isSearchActive,
  onSearchActiveChange,
}: HeaderProps) {
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
        onSearchActiveChange(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isSearchActive, query, onSearchActiveChange])

  return (
    <header 
      ref={headerRef}
      className="pointer-events-none fixed top-0 right-0 left-0 z-20 flex min-h-[56px] items-center justify-between gap-2 px-4 py-3"
    >
      <div className="pointer-events-auto flex flex-1 items-center gap-2 overflow-hidden">
        <div className="relative flex-1 min-w-0">
          <motion.div
            className="flex items-center pointer-events-auto shrink-0"
            animate={
              !isSearchActive && !query
                ? { opacity: 1, x: 0, pointerEvents: "auto" }
                : { opacity: 0, x: -20, pointerEvents: "none" }
            }
            transition={{ duration: 0.1, ease: "linear" }}
          >
            <Image
              src="/logo.png"
              alt="Logo"
              width={28}
              height={28}
              className="h-7 w-7 object-contain brightness-100"
              priority
            />
          </motion.div>

          <motion.div
            className={cn(
              "glass-slab absolute inset-0 flex items-center gap-2 rounded-lg px-3 py-1.5",
              !(isSearchActive || query) && "opacity-0"
            )}
            initial={false}
            animate={
              isSearchActive || query
                ? { opacity: 1, pointerEvents: "auto" }
                : { opacity: 0, pointerEvents: "none" }
            }
            transition={{ duration: 0.1, ease: "linear" }}
          >
            <SearchIcon className="h-4 w-4 text-primary/80 opacity-70 shrink-0" />
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onBlur={() => !query && onSearchActiveChange(false)}
              placeholder="Артист или площадка"
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground py-1"
            />
            {query && (
              <button
                onClick={() => {
                  onQueryChange("")
                  onSearchActiveChange(false)
                }}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Notch Month Label - Centered */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none">
        <AnimatePresence>
          {!isSearchActive && monthsLabel && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.1, ease: "linear" }}
              className="glass-slab px-6 py-1.5 rounded-b-[20px] flex items-center justify-center"
            >
              <span className="text-xs font-medium tracking-wide text-foreground/80">
                {monthsLabel}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-auto flex items-center gap-2 shrink-0">
        <div className="relative h-9 w-9">
          <motion.button
            type="button"
            onClick={() => onSearchActiveChange(true)}
            aria-label="Поиск"
            className="glass-slab absolute inset-0 flex items-center justify-center rounded-lg"
            animate={
              !isSearchActive && !query
                ? { opacity: 1, pointerEvents: "auto" }
                : { opacity: 0, pointerEvents: "none" }
            }
            transition={{ duration: 0.18, ease: [0.2, 0.7, 0, 1] }}
          >
            <SearchIcon className="h-4 w-4 text-foreground opacity-70" />
          </motion.button>
        </div>
        <Button
          variant={showFilters ? "default" : "secondary"}
          size="sm"
          onClick={onToggleFilters}
          className={cn(
            "relative gap-1.5 rounded-lg hidden sm:inline-flex",
            showFilters
              ? "bg-primary text-primary-foreground"
              : "glass-slab text-foreground"
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
            "gap-1.5 rounded-lg",
            showAdmin
              ? "bg-primary text-primary-foreground"
              : isAdmin
                ? "glass-slab text-primary"
                : "glass-slab text-foreground"
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
