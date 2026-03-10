"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion, useMotionValue } from "framer-motion"
import type { Filters, Genre, ConcertEvent, Venue } from "@/lib/types"
import {
  ALL_GENRES,
  GENRE_LABELS,
  GENRE_COLORS,
  DEFAULT_FILTERS,
  getTodayISO,
} from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  CalendarIcon,
  RotateCcwIcon,
  CheckIcon,
  Search as SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  XIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { addDays, differenceInCalendarDays, format } from "date-fns"
import { ru } from "date-fns/locale"
import { EventCard } from "@/components/event-card"

const MAX_DAYS_AHEAD = 14

function formatDatePill(date: Date) {
  const weekday = format(date, "EEEEEE", { locale: ru })
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  const label = format(date, "d")
  
  return { label, weekday: capitalizedWeekday }
}

function useDragScroller() {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const [bounds, setBounds] = useState({ left: 0, right: 0 })

  const recalc = useCallback(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    const lastChild = content.lastElementChild as HTMLElement | null
    if (!lastChild) return

    const screenRight = window.innerWidth
    const contentRect = content.getBoundingClientRect()
    const contentLeftAtZero = contentRect.left - x.get()
    const lastChildRightAtZero = contentLeftAtZero + lastChild.offsetLeft + lastChild.offsetWidth

    const triggerLeft = Math.min(0, screenRight - lastChildRightAtZero)
    setBounds({ left: triggerLeft, right: 0 })

    const clamped = Math.min(0, Math.max(triggerLeft, x.get()))
    x.set(clamped)
  }, [x])

  useEffect(() => { recalc() }, [recalc])
  useEffect(() => {
    const onResize = () => recalc()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [recalc])
  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return
    const observer = new ResizeObserver(() => recalc())
    observer.observe(containerRef.current)
    observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [recalc])

  return { containerRef, contentRef, x, bounds }
}

interface FilterPanelProps {
  variant?: "side" | "bottom"
  peek?: boolean
  onPeekOpen?: () => void
  onRequestClose?: () => void
  onRequestOpen?: () => void
  open?: boolean
  filterCount?: number
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  // Event cards list
  events?: ConcertEvent[]
  venues?: Venue[]
}

export function FilterPanel({
  filters,
  onFiltersChange,
  variant = "side",
  peek = false,
  onPeekOpen,
  onRequestClose,
  onRequestOpen,
  open = false,
  filterCount = 0,
  events = [],
  venues = [],
}: FilterPanelProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const todayISO = getTodayISO()
  const todayDate = useMemo(() => new Date(`${todayISO}T00:00:00`), [todayISO])
  const maxDate = useMemo(() => addDays(todayDate, MAX_DAYS_AHEAD), [todayDate])

  const updateFilters = (partial: Partial<Filters>) => {
    onFiltersChange({ ...filters, ...partial })
  }

  const selectedDate = useMemo(
    () => (filters.date ? new Date(`${filters.date}T00:00:00`) : todayDate),
    [filters.date, todayDate]
  )
  const datesList = useMemo(() => {
    const days = []
    for (let i = 0; i <= MAX_DAYS_AHEAD; i++) {
      days.push(addDays(todayDate, i))
    }
    return days
  }, [todayDate])

  const monthsLabel = useMemo(() => {
    const months = new Set<string>()
    datesList.forEach(d => {
      const m = format(d, "LLLL", { locale: ru })
      months.add(m.charAt(0).toUpperCase() + m.slice(1))
    })
    return Array.from(months).join(" — ")
  }, [datesList])

  const resetFilters = useCallback(() => {
    onFiltersChange({
      ...DEFAULT_FILTERS,
      date: getTodayISO(),
    })
  }, [onFiltersChange])

  const toggleGenre = (genre: Genre) => {
    const genres = filters.genres.includes(genre)
      ? filters.genres.filter((g) => g !== genre)
      : [...filters.genres, genre]
    updateFilters({ genres })
  }

  const datesScroller = useDragScroller()
  const genresScroller = useDragScroller()

  const containerClass = cn(
    "pointer-events-auto flex flex-col bg-background/90 shadow-2xl backdrop-blur-xl",
    variant === "side"
      ? "h-full w-80"
      : "h-[50vh] w-full rounded-t-2xl border-t border-border"
  )

  const hasActiveFilters =
    filters.genres.length > 0 ||
    (filters.date !== undefined && filters.date !== todayISO) ||
    (filters.query && filters.query.trim() !== "") ||
    Boolean(filters.venueId)

  // Selected venue name for chip display
  const selectedVenueName = filters.venueId
    ? venues.find((v) => v.id === filters.venueId)?.name
    : undefined

  // Build list title
  const listTitle = useMemo(() => {
    if (selectedVenueName) return selectedVenueName
    if (filters.date && filters.date !== todayISO) {
      return format(selectedDate, "d MMMM", { locale: ru })
    }
    return "Сегодня"
  }, [selectedVenueName, filters.date, todayISO, selectedDate])

  return (
    <div className={containerClass}>
      {/* Compact Layout: Month, Search & Reset in one line */}
      <div className="shrink-0 px-4 pt-4 pb-2 flex flex-col gap-4 border-b border-border/10">
        
        {/* Top Row: Month label + Actions (Reset) */}
        <div className="flex items-center justify-between min-h-[32px]">
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">
              {monthsLabel}
            </span>
            
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-7 gap-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-primary transition-colors"
                >
                  <RotateCcwIcon className="h-3 w-3" />
                  Сброс
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Date chips */}
        <div
          ref={datesScroller.containerRef}
          className="w-full overflow-hidden"
          role="listbox"
          aria-label="Выбор даты"
        >
          <motion.div
            ref={datesScroller.contentRef}
            drag="x"
            dragConstraints={datesScroller.bounds}
            dragElastic={0.2}
            dragMomentum={false}
            style={{ x: datesScroller.x }}
            className="flex w-max cursor-grab flex-nowrap gap-2 py-0.5 active:cursor-grabbing"
          >
            {datesList.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd")
              const isActive = filters.date === dateStr
              const { label, weekday } = formatDatePill(date)
              return (
                <button
                  key={dateStr}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => updateFilters({ date: dateStr })}
                  className={cn(
                    "flex flex-row h-9 gap-1.5 shrink-0 items-center justify-center rounded-xl px-3.5 transition-all pointer-events-auto border border-transparent",
                    isActive
                      ? "bg-foreground text-background shadow-md font-semibold"
                      : "bg-secondary/30 text-secondary-foreground hover:bg-secondary/50 font-medium"
                  )}
                  draggable={false}
                >
                  <span className="text-[13px] font-semibold leading-none">
                    {label}
                  </span>
                  <span className={cn(
                    "text-[11px] tracking-tight opacity-50 font-medium leading-none",
                    isActive && "opacity-80 font-semibold"
                  )}>
                    {weekday}
                  </span>
                </button>
              )
            })}
          </motion.div>
        </div>

        {/* Genre chips */}
        <div
          ref={genresScroller.containerRef}
          className="w-full overflow-hidden"
          role="listbox"
          aria-label="Выбор жанров"
          aria-multiselectable="true"
        >
          <motion.div
            ref={genresScroller.contentRef}
            drag="x"
            dragConstraints={genresScroller.bounds}
            dragElastic={0.2}
            dragMomentum={false}
            style={{ x: genresScroller.x }}
            className="flex w-max cursor-grab flex-nowrap gap-2 py-1 active:cursor-grabbing"
          >
            {ALL_GENRES.map((genre) => {
              const isActive = filters.genres.includes(genre)
              return (
                <button
                  key={genre}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => toggleGenre(genre)}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all pointer-events-auto border border-transparent",
                    isActive
                      ? GENRE_COLORS[genre]
                      : "bg-secondary/30 text-secondary-foreground hover:bg-accent/50"
                  )}
                  draggable={false}
                >
                  {isActive && <CheckIcon className="h-3 w-3" />}
                  {GENRE_LABELS[genre]}
                </button>
              )
            })}
          </motion.div>
        </div>

        {/* Selected venue chip */}
        {selectedVenueName && (
          <div className="flex items-center gap-1.5 mt-[-4px]">
            <span className="flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-medium text-primary shadow-sm shadow-primary/5">
              <MapPinIcon className="h-3 w-3" />
              {selectedVenueName}
              <button
                onClick={() => updateFilters({ venueId: undefined })}
                className="ml-0.5 rounded-full hover:text-primary/70 transition-colors"
                aria-label="Снять фильтр по площадке"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Event cards — ScrollArea isolated from chips width */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-3 px-4 pb-4">
          {(!mounted || events.length === 0) ? (
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border py-6">
              <p className="text-xs text-muted-foreground">Концертов не найдено</p>
            </div>
          ) : (
            events.map((event) => {
              const venue = venues.find((v) => v.id === event.venueId)
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  venueName={venue?.name}
                />
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
