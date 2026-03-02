"use client"

import type { Venue, ConcertEvent } from "@/lib/types"
import { GENRE_LABELS, GENRE_COLORS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { EditIcon, TrashIcon, CalendarIcon } from "lucide-react"

interface EventListProps {
  events: ConcertEvent[]
  venues: Venue[]
  onEdit: (event: ConcertEvent) => void
  onDelete: (id: string) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  })
}

export function EventList({ events, venues, onEdit, onDelete }: EventListProps) {
  const venueMap = venues.reduce(
    (acc, v) => {
      acc[v.id] = v.name
      return acc
    },
    {} as Record<string, string>
  )

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  if (events.length === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground py-8">
        Нет мероприятий. Создайте первое!
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {sortedEvents.map((event) => (
        <div
          key={event.id}
          className="flex items-start gap-3 rounded-lg border border-border bg-card/50 p-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <CalendarIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium text-foreground">
              {event.title}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {event.artist}
              {" \u2022 "}
              {venueMap[event.venueId] || "?"}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {formatDate(event.date)} {event.time}
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                  GENRE_COLORS[event.genre]
                )}
              >
                {GENRE_LABELS[event.genre]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(event)}
            >
              <EditIcon className="h-3 w-3" />
              <span className="sr-only">Редактировать</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(event.id)}
            >
              <TrashIcon className="h-3 w-3" />
              <span className="sr-only">Удалить</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
