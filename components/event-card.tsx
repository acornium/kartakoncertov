"use client"

import type { ConcertEvent } from "@/lib/types"
import { GENRE_LABELS, GENRE_COLORS } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, ClockIcon, TicketIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EventCardProps {
  event: ConcertEvent
  venueName?: string
  compact?: boolean
  selectedDate?: string
  selectedGenres?: string[]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  })
}

function formatPrice(price: number, priceMax?: number): string {
  const fmt = (n: number) => n.toLocaleString("ru-RU")
  if (priceMax && priceMax > price) {
    return `${fmt(price)} - ${fmt(priceMax)} ₽`
  }
  return `${fmt(price)} ₽`
}

export function EventCard({ event, venueName, compact, selectedDate, selectedGenres = [] }: EventCardProps) {
  const isDateRedundant = selectedDate === event.date;
  const isGenreRedundant = selectedGenres.length > 0 && selectedGenres.includes(event.genre);

  if (compact) {
    return (
      <div className="flex flex-col gap-1 rounded-md border border-border/20 bg-background/40 p-2 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-foreground">
            {event.artist}
          </span>
          {!isGenreRedundant && (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                GENRE_COLORS[event.genre]
              )}
            >
              {GENRE_LABELS[event.genre]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {!isDateRedundant && (
            <span className="flex items-center gap-0.5">
              <CalendarIcon className="h-2.5 w-2.5" />
              {formatDate(event.date)}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <TicketIcon className="h-2.5 w-2.5" />
            {"от "}{event.price.toLocaleString("ru-RU")} ₽
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-row items-start justify-between gap-3 rounded-xl border border-border/20 bg-background/60 p-3 shadow-sm backdrop-blur-sm transition-all hover:bg-background/70">
      {/* Left Column: Main Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h4 className="truncate text-sm font-semibold text-foreground leading-tight">
          {event.title}
        </h4>
        <p className="truncate text-xs text-muted-foreground">{event.artist}</p>
        
        {/* Genre Badge - Compact below info if not redundant */}
        {!isGenreRedundant && (
          <div className="mt-1">
            <span className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider",
              GENRE_COLORS[event.genre]
            )}>
              {GENRE_LABELS[event.genre]}
            </span>
          </div>
        )}
      </div>

      {/* Right Column: Meta Info */}
      <div className="flex shrink-0 flex-col items-end justify-between self-stretch text-right">
        {venueName && (
          <p className="truncate text-[10px] font-medium text-muted-foreground/70 uppercase tracking-tight">
            {venueName}
          </p>
        )}
        
        <div className="flex flex-col items-end gap-0.5">
          {!isDateRedundant && (
            <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
              <CalendarIcon className="h-2.5 w-2.5" />
              {formatDate(event.date)}
            </div>
          )}
          <div className="text-sm font-black text-foreground">
            {formatPrice(event.price, event.priceMax)}
          </div>
        </div>
      </div>
    </div>
  )
}
