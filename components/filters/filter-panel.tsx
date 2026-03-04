"use client"

import { useCallback } from "react"
import type { Filters, Genre } from "@/lib/types"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { addDays, differenceInCalendarDays, format } from "date-fns"
import { ru } from "date-fns/locale"

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
}: FilterPanelProps) {
  const todayISO = getTodayISO()
  const todayDate = new Date(`${todayISO}T00:00:00`)
  const maxDaysAhead = 14
  const maxDate = addDays(todayDate, maxDaysAhead)

  const updateFilters = useCallback(
    (partial: Partial<Filters>) => {
      onFiltersChange({ ...filters, ...partial })
    },
    [filters, onFiltersChange]
  )

  const selectedDate = filters.date
    ? new Date(`${filters.date}T00:00:00`)
    : todayDate
  const dayOffset = Math.min(
    maxDaysAhead,
    Math.max(0, differenceInCalendarDays(selectedDate, todayDate))
  )

  const shiftDate = useCallback(
    (delta: number) => {
      const next = addDays(selectedDate, delta)
      if (next < todayDate) return
      if (next > maxDate) return
      updateFilters({ date: format(next, "yyyy-MM-dd") })
    },
    [selectedDate, todayDate, maxDate, updateFilters]
  )

  const resetFilters = useCallback(() => {
    onFiltersChange({
      ...DEFAULT_FILTERS,
      date: getTodayISO(),
    })
  }, [onFiltersChange])

  // dragging support removed since bottom panel is fixed half-screen

  const toggleGenre = useCallback(
    (genre: Genre) => {
      const genres = filters.genres.includes(genre)
        ? filters.genres.filter((g) => g !== genre)
        : [...filters.genres, genre]
      updateFilters({ genres })
    },
    [filters.genres, updateFilters]
  )


  const containerClass = cn(
    "pointer-events-auto flex flex-col bg-background/90 shadow-2xl backdrop-blur-xl",
    variant === "side"
      ? "h-full w-80"
      : "h-[50vh] w-full rounded-t-2xl border-t border-border"
  )

  const hasActiveFilters =
    filters.genres.length > 0 ||
    (filters.date !== undefined && filters.date !== todayISO) ||
    (filters.query && filters.query.trim() !== "")

  return (
    <div
      className={containerClass}
    >
      

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

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-6 p-4">
          {/* Date range */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Дата
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => shiftDate(-1)}
                  disabled={dayOffset === 0}
                  aria-label="Предыдущий день"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="justify-start gap-1.5 text-xs"
                    >
                      <CalendarIcon className="h-3 w-3" />
                      {format(selectedDate, "d MMMM", { locale: ru })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      disabled={{ before: todayDate, after: maxDate }}
                      locale={ru}
                      onSelect={(date) =>
                        updateFilters({
                          date: date ? format(date, "yyyy-MM-dd") : undefined,
                        })
                      }
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => shiftDate(1)}
                  disabled={dayOffset === maxDaysAhead}
                  aria-label="Следующий день"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* Genre filter */}
          <section className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Жанр
            </Label>
            <div className="flex flex-wrap gap-2">
              {ALL_GENRES.map((genre) => {
                const isActive = filters.genres.includes(genre)
                return (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={cn(
                      "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-all",
                      isActive
                        ? GENRE_COLORS[genre]
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    )}
                  >
                    {isActive && <CheckIcon className="h-3 w-3" />}
                    {GENRE_LABELS[genre]}
                  </button>
                )
              })}
            </div>
          </section>

        </div>
      </ScrollArea>
    </div>
  )
}
