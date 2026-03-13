"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
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
import Image from "next/image"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  CalendarIcon,
  ClockIcon,
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
  onPanelHeightChange?: (height: number) => void
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
  onPanelHeightChange,
}: FilterPanelProps) {
  const localPanelRef = useRef<HTMLDivElement>(null)
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const node = localPanelRef.current
    if (!node || !onPanelHeightChange) return

    const emit = () => onPanelHeightChange(node.getBoundingClientRect().height)
    emit()
    const observer = new ResizeObserver(() => emit())
    observer.observe(node)
    return () => observer.disconnect()
  }, [onPanelHeightChange])

  useEffect(() => {
    if (typeof document !== "undefined") {
      setPortalEl(document.body)
    }
  }, [])
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

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

  const datesContainerRef = useRef<HTMLDivElement>(null)
  const datesContentRef = useRef<HTMLDivElement>(null)
  const datesX = useMotionValue(0)
  const [datesBounds, setDatesBounds] = useState({ left: 0, right: 0 })

  const genresContainerRef = useRef<HTMLDivElement>(null)
  const genresContentRef = useRef<HTMLDivElement>(null)
  const genresX = useMotionValue(0)
  const [genresBounds, setGenresBounds] = useState({ left: 0, right: 0 })

  const recalcDates = useCallback(() => {
    const container = datesContainerRef.current
    const content = datesContentRef.current
    if (!container || !content) return

    const lastChild = content.lastElementChild as HTMLElement | null
    if (!lastChild) return

    const screenRight = window.innerWidth
    const contentRect = content.getBoundingClientRect()
    const contentLeftAtZero = contentRect.left - datesX.get()
    const lastChildRightAtZero = contentLeftAtZero + lastChild.offsetLeft + lastChild.offsetWidth

    const triggerLeft = Math.min(0, screenRight - lastChildRightAtZero)
    setDatesBounds({ left: triggerLeft, right: 0 })

    const clamped = Math.min(0, Math.max(triggerLeft, datesX.get()))
    datesX.set(clamped)
  }, [datesX])

  const recalcGenres = useCallback(() => {
    const container = genresContainerRef.current
    const content = genresContentRef.current
    if (!container || !content) return

    const lastChild = content.lastElementChild as HTMLElement | null
    if (!lastChild) return

    const screenRight = window.innerWidth
    const contentRect = content.getBoundingClientRect()
    const contentLeftAtZero = contentRect.left - genresX.get()
    const lastChildRightAtZero = contentLeftAtZero + lastChild.offsetLeft + lastChild.offsetWidth

    const triggerLeft = Math.min(0, screenRight - lastChildRightAtZero)
    setGenresBounds({ left: triggerLeft, right: 0 })

    const clamped = Math.min(0, Math.max(triggerLeft, genresX.get()))
    genresX.set(clamped)
  }, [genresX])

  useEffect(() => { recalcDates() }, [recalcDates])
  useEffect(() => { recalcGenres() }, [recalcGenres])
  useEffect(() => {
    const onResize = () => {
      recalcDates()
      recalcGenres()
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [recalcDates, recalcGenres])
  useEffect(() => {
    const datesContainer = datesContainerRef.current
    const datesContent = datesContentRef.current
    if (!datesContainer || !datesContent) return
    const observer = new ResizeObserver(() => recalcDates())
    observer.observe(datesContainer)
    observer.observe(datesContent)
    return () => observer.disconnect()
  }, [recalcDates])
  useEffect(() => {
    const genresContainer = genresContainerRef.current
    const genresContent = genresContentRef.current
    if (!genresContainer || !genresContent) return
    const observer = new ResizeObserver(() => recalcGenres())
    observer.observe(genresContainer)
    observer.observe(genresContent)
    return () => observer.disconnect()
  }, [recalcGenres])

  const containerClass = cn(
    "glass-slab pointer-events-auto flex flex-col",
    variant === "side"
      ? "h-full w-80 border-l"
      : "h-[42vh] w-full rounded-t-2xl border-t"
  )

  const hasActiveFilters =
    filters.genres.length > 0 ||
    (filters.date !== undefined && filters.date !== todayISO) ||
    (filters.query && filters.query.trim() !== "") ||
    Boolean(filters.venueId)

  // Build list title
  const listTitle = useMemo(() => {
    if (filters.date && filters.date !== todayISO) {
      return format(selectedDate, "d MMMM", { locale: ru })
    }
    return "Сегодня"
  }, [filters.date, todayISO, selectedDate])

  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeEventId) ?? null,
    [events, activeEventId]
  )



  return (
    <div ref={localPanelRef} className={containerClass}>
      <div className="shrink-0 px-4 pt-3 pb-3 flex flex-col gap-2 border-b border-border/10">
        {/* Date chips */}
        <div
          ref={datesContainerRef}
          className="w-full overflow-hidden"
          role="listbox"
          aria-label="Выбор даты"
        >
          <motion.div
            ref={datesContentRef}
            drag="x"
            dragConstraints={datesBounds}
            dragElastic={0.2}
            dragMomentum={false}
            style={{ x: datesX }}
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
                    "flex flex-row h-9 gap-1.5 shrink-0 items-center justify-center rounded-lg px-3.5 transition-all pointer-events-auto border border-transparent",
                    isActive
                      ? "bg-foreground text-background shadow-md font-semibold"
                      : "bg-secondary/70 text-secondary-foreground hover:bg-secondary/85 font-medium"
                  )}
                  draggable={false}
                >
                  <span className="text-[13px] font-semibold leading-none">
                    {label}
                  </span>
                  <span className={cn(
                    "text-[12px] tracking-tight opacity-50 font-medium leading-none",
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
          ref={genresContainerRef}
          className="w-full overflow-hidden"
          role="listbox"
          aria-label="Выбор жанров"
          aria-multiselectable="true"
        >
          <motion.div
            ref={genresContentRef}
            drag="x"
            dragConstraints={genresBounds}
            dragElastic={0.2}
            dragMomentum={false}
            style={{ x: genresX }}
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
                      : "bg-secondary/40 text-secondary-foreground/70 hover:bg-secondary/55"
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

      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-3 px-4 pb-4">
          {(!isClient || events.length === 0) ? (
            <div className="glass-slab flex flex-col items-center gap-1.5 rounded-xl py-8">
              <p className="text-[12px] text-muted-foreground">Концертов не найдено</p>
            </div>
          ) : (
            events.map((event) => {
              const venue = venues.find((v) => v.id === event.venueId)
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  venueName={venue?.name}
                  selectedDate={filters.date}
                  selectedGenres={filters.genres}
                  onClick={() => setActiveEventId(event.id)}
                />
              )
            })
          )}
        </div>
      </ScrollArea>

      {portalEl &&
        activeEvent &&
        createPortal(
          <div className="fixed inset-0 z-[999] md:items-center md:justify-center">
            <div
              className="absolute inset-0 bg-white/30"
              onClick={() => setActiveEventId(null)}
            />
            <div
              className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-xl rounded-t-3xl border border-border/20 bg-background/95 p-5 shadow-xl md:relative md:bottom-auto md:rounded-3xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
                  <button
                    type="button"
                    onClick={() => setActiveEventId(null)}
                    className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted-foreground hover:text-foreground"
                    aria-label="Закрыть"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                  <div className="relative mb-4 h-32 w-full overflow-hidden rounded-2xl border border-border/20 bg-muted/60 md:h-40">
                    <Image
                      src="/mock-event.jpg"
                      alt="Фото события"
                      fill
                      className="object-cover object-center"
                      priority
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-foreground">
                        {activeEvent.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {activeEvent.artist}
                      </p>
                    </div>
                  </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium tracking-wide",
                    GENRE_COLORS[activeEvent.genre]
                  )}
                >
                  {GENRE_LABELS[activeEvent.genre]}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {format(new Date(`${activeEvent.date}T00:00:00`), "d MMMM", {
                    locale: ru,
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  {activeEvent.time}
                </span>
              </div>

              <div className="mt-3 rounded-xl border border-border/20 bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <MapPinIcon className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">
                    {venues.find((v) => v.id === activeEvent.venueId)?.name}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {venues.find((v) => v.id === activeEvent.venueId)?.address}
                </p>
              </div>

              <div className="mt-3">
                <p className="text-sm text-muted-foreground">
                  {activeEvent.description ?? "Описание появится позже."}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-base font-semibold text-foreground">
                  {activeEvent.price.toLocaleString("ru-RU")} ₽
                </div>
                <Button type="button" className="rounded-full px-6">
                  Купить билет
                </Button>
              </div>
            </div>
          </div>,
          portalEl
        )}
    </div>
  )
}
