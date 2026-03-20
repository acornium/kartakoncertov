"use client"

import { Button } from "@/components/ui/button"
import { FilterIcon, ShieldIcon, MusicIcon, XIcon, Search as SearchIcon } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { cn, assetPath } from "@/lib/utils"

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
  selectedVenueName?: string
  isSearchActive: boolean
  onSearchActiveChange: (active: boolean) => void
  onLogoClick?: () => void
  onNotchBottomChange?: (px: number) => void
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
  selectedVenueName,
  isSearchActive,
  onSearchActiveChange,
  onLogoClick,
  onNotchBottomChange,
}: HeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const notchRef = useRef<HTMLDivElement>(null)
  const lastNotchBottomRef = useRef<number>(-1)
  const rafRef = useRef<number | null>(null)
  const resizeTimerRef = useRef<number | null>(null)

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

  useEffect(() => {
    if (!onNotchBottomChange) return

    const measure = () => {
      const notchBottom = notchRef.current?.getBoundingClientRect().bottom
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom
      const next = Math.round(notchBottom ?? headerBottom ?? 0)
      if (Math.abs(next - lastNotchBottomRef.current) < 2) return
      lastNotchBottomRef.current = next
      onNotchBottomChange(next)
    }

    const scheduleMeasure = () => {
      if (rafRef.current !== null) return
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        measure()
      })
    }

    const scheduleOnResize = () => {
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current)
      }
      resizeTimerRef.current = window.setTimeout(() => {
        resizeTimerRef.current = null
        scheduleMeasure()
      }, 150)
    }

    scheduleMeasure()
    window.addEventListener("resize", scheduleOnResize)
    return () => {
      window.removeEventListener("resize", scheduleOnResize)
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current)
        resizeTimerRef.current = null
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [onNotchBottomChange, isSearchActive, monthsLabel, selectedVenueName])

  return (
    <header 
      ref={headerRef}
      className="pointer-events-none fixed top-0 right-0 left-0 z-20 flex min-h-[56px] items-center justify-between gap-2 px-4 py-3"
    >
      <div className="pointer-events-auto flex flex-1 items-center gap-2 overflow-hidden">
        <div className="relative flex-1 min-w-0">
          <motion.button
            type="button"
            onClick={onLogoClick}
            aria-label="Карта Москвы"
            className="flex items-center pointer-events-auto shrink-0"
            animate={
              !isSearchActive && !query && !selectedVenueName
                ? { opacity: 1, x: 0, pointerEvents: "auto" }
                : { opacity: 0, x: -20, pointerEvents: "none" }
            }
            transition={{ duration: 0.1, ease: "linear" }}
          >
            <Image
              src={assetPath("/logo.png")}
              alt="Logo"
              width={28}
              height={28}
              className="h-7 w-7 object-contain brightness-100"
              priority
            />
          </motion.button>

          <motion.div
            className={cn(
              "glass-slab absolute inset-0 flex items-center gap-2 rounded-lg px-3 py-1.5",
              (!(isSearchActive || query) || selectedVenueName) && "opacity-0"
            )}
            initial={false}
            animate={
              (isSearchActive || query) && !selectedVenueName
                ? { opacity: 1, pointerEvents: "auto" }
                : { opacity: 0, pointerEvents: "none" }
            }
            transition={{ duration: 0.1, ease: "linear" }}
          >
            <SearchIcon className="h-4 w-4 text-primary/80 opacity-70 shrink-0" />
            <input
              ref={searchInputRef}
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
            <div
              ref={notchRef}
              className={cn(
                "glass-slab relative rounded-b-2xl flex min-h-[40px] items-center justify-center whitespace-nowrap px-7 py-1.5"
              )}
            >
              <span
                className={cn(
                  "text-[13px] font-semibold tracking-wide text-foreground/85 truncate max-w-[60vw] transition-opacity leading-tight",
                  selectedVenueName ? "absolute opacity-0 duration-0" : "opacity-100 duration-1000"
                )}
              >
                {monthsLabel}
              </span>
              {selectedVenueName && (
                <span className="text-[16px] font-semibold tracking-wide text-foreground/85 truncate max-w-[78vw] leading-tight">
                  {selectedVenueName}
                </span>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-auto flex items-center gap-2 shrink-0">
        <div className="relative h-10 w-10">
          <motion.button
            type="button"
            onClick={() => onSearchActiveChange(true)}
            aria-label="Поиск"
            className="glass-slab absolute inset-0 flex items-center justify-center rounded-lg"
            animate={
              !isSearchActive && !query && !selectedVenueName
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
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
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
