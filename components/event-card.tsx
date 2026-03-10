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

export function EventCard({ event, venueName, compact, selectedDate }: EventCardProps) {
  const isDateRedundant = selectedDate === event.date;

  if (compact) {
    return (
      <div className="flex flex-col gap-1 rounded-md border border-border bg-card/50 p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-foreground">
            {event.artist}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              GENRE_COLORS[event.genre]
            )}
          >
            {GENRE_LABELS[event.genre]}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {!isDateRedundant && (
            <span className="flex items-center gap-0.5">
              <CalendarIcon className="h-2.5 w-2.5" />
              {formatDate(event.date)}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <ClockIcon className="h-2.5 w-2.5" />
            {event.time}
          </span>
          <span className="flex items-center gap-0.5">
            <TicketIcon className="h-2.5 w-2.5" />
            {"от "}{event.price.toLocaleString("ru-RU")} ₽
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold text-foreground">
            {event.title}
          </h4>
          <p className="text-xs text-muted-foreground">{event.artist}</p>
          {venueName && (
            <p className="text-xs text-muted-foreground/70">{venueName}</p>
          )}
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "shrink-0 text-[10px]",
            GENRE_COLORS[event.genre]
          )}
        >
          {GENRE_LABELS[event.genre]}
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {!isDateRedundant && (
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            {formatDate(event.date)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />
          {event.time}
        </span>
      </div>
      <div className="flex items-center gap-1 text-sm font-medium text-foreground">
        <TicketIcon className="h-3.5 w-3.5 text-primary" />
        {formatPrice(event.price, event.priceMax)}
      </div>
      {event.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {event.description}
        </p>
      )}
    </div>
  )
}
