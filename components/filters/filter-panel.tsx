"use client"

import { useCallback } from "react"
import type { Venue, Filters, Genre } from "@/lib/types"
import {
  ALL_GENRES,
  GENRE_LABELS,
  GENRE_COLORS,
  DEFAULT_FILTERS,
} from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, RotateCcwIcon, XIcon, CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

interface FilterPanelProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  venues: Venue[]
  onClose: () => void
}

export function FilterPanel({
  filters,
  onFiltersChange,
  venues,
  onClose,
}: FilterPanelProps) {
  const updateFilters = useCallback(
    (partial: Partial<Filters>) => {
      onFiltersChange({ ...filters, ...partial })
    },
    [filters, onFiltersChange]
  )

  const resetFilters = useCallback(() => {
    onFiltersChange({
      ...DEFAULT_FILTERS,
      venueId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    })
  }, [onFiltersChange])

  const toggleGenre = useCallback(
    (genre: Genre) => {
      const genres = filters.genres.includes(genre)
        ? filters.genres.filter((g) => g !== genre)
        : [...filters.genres, genre]
      updateFilters({ genres })
    },
    [filters.genres, updateFilters]
  )

  const hasActiveFilters =
    filters.genres.length > 0 ||
    filters.venueId !== undefined ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    filters.priceMin > 0 ||
    filters.priceMax < DEFAULT_FILTERS.priceMax

  return (
    <div className="pointer-events-auto flex h-full w-80 flex-col bg-background/90 shadow-2xl backdrop-blur-xl">
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
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Закрыть фильтры</span>
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-6 p-4">
          {/* Date range */}
          <section className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Дата
            </Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className={cn(
                      "flex-1 justify-start gap-1.5 text-xs",
                      !filters.dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-3 w-3" />
                    {filters.dateFrom
                      ? format(new Date(filters.dateFrom), "d MMM", {
                          locale: ru,
                        })
                      : "От"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      filters.dateFrom ? new Date(filters.dateFrom) : undefined
                    }
                    onSelect={(date) =>
                      updateFilters({
                        dateFrom: date ? format(date, "yyyy-MM-dd") : undefined,
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className={cn(
                      "flex-1 justify-start gap-1.5 text-xs",
                      !filters.dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-3 w-3" />
                    {filters.dateTo
                      ? format(new Date(filters.dateTo), "d MMM", {
                          locale: ru,
                        })
                      : "До"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                    onSelect={(date) =>
                      updateFilters({
                        dateTo: date ? format(date, "yyyy-MM-dd") : undefined,
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
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
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
                      isActive
                        ? GENRE_COLORS[genre]
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    )}
                  >
                    {isActive && (
                      <CheckIcon className="h-3 w-3" />
                    )}
                    {GENRE_LABELS[genre]}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Venue filter */}
          <section className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Площадка
            </Label>
            <Select
              value={filters.venueId || "all"}
              onValueChange={(v) =>
                updateFilters({ venueId: v === "all" ? undefined : v })
              }
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Все площадки" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все площадки</SelectItem>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* Price filter */}
          <section className="flex flex-col gap-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Цена билета
            </Label>
            <Slider
              min={DEFAULT_FILTERS.priceMin}
              max={DEFAULT_FILTERS.priceMax}
              step={500}
              value={[filters.priceMin, filters.priceMax]}
              onValueChange={([min, max]) =>
                updateFilters({ priceMin: min, priceMax: max })
              }
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{filters.priceMin.toLocaleString("ru-RU")} ₽</span>
              <span>{filters.priceMax.toLocaleString("ru-RU")} ₽</span>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  )
}
