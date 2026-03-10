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

function formatDatePill(date: Date, today: Date) {
  const diff = differenceInCalendarDays(date, today)
  if (diff === 0) return "Сегодня"
  if (diff === 1) return "Завтра"
  return format(date, "d MMM", { locale: ru })
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

      {variant === "bottom" && peek && (
        <div className="flex w-full items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex w-full items-center gap-3 bg-background/80 rounded-md px-3 py-2">
            <SearchIcon className="h-5 w-5 text-primary" />
            <input
              type="text"
              value={filters.query || ""}
              onChange={(e) => updateFilters({ query: e.target.value })}
              placeholder="Артист или площадка"
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}

      {!(variant === "bottom" && peek) && (
        <>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Фильтры</h2>
            <div className="flex items-center gap-1">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                >
                  <RotateCcwIcon className="h-3 w-3" />
                  Сбросить
                </Button>
              )}
            </div>
          </div>
          <div className="px-4 py-2">
            <input
              type="text"
              value={filters.query || ""}
              onChange={(e) => updateFilters({ query: e.target.value })}
              placeholder="Артист или площадка"
              className="w-full bg-background/80 text-sm text-foreground placeholder:text-muted-foreground rounded-md px-2 py-1"
            />
          </div>
        </>
      )}

      {/* Scrollable Filters (Dates & Genres) */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex flex-col gap-4 border-b border-border/10">
        
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
            className="flex w-max cursor-grab flex-nowrap gap-2 py-1 active:cursor-grabbing"
          >
            {datesList.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd")
              const isActive = filters.date === dateStr
              return (
                <button
                  key={dateStr}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => updateFilters({ date: dateStr })}
                  className={cn(
                    "flex flex-col h-8 shrink-0 justify-center rounded-xl px-3 text-xs tracking-tight transition-all pointer-events-auto",
                    isActive
                      ? "bg-foreground text-background shadow-md font-semibold"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium"
                  )}
                  draggable={false}
                >
                  {formatDatePill(date, todayDate)}
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
                    "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-all pointer-events-auto",
                    isActive
                      ? GENRE_COLORS[genre]
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
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
            <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
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

          {/* List header */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-foreground">
              {listTitle}
            </span>
            {mounted && events.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {events.length} {events.length === 1 ? "концерт" : events.length < 5 ? "концерта" : "концертов"}
              </span>
            )}
          </div>

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
