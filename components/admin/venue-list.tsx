"use client"

import type { Venue, ConcertEvent } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { EditIcon, TrashIcon, MapPinIcon } from "lucide-react"

interface VenueListProps {
  venues: Venue[]
  events: ConcertEvent[]
  onEdit: (venue: Venue) => void
  onDelete: (id: string) => void
}

export function VenueList({ venues, events, onEdit, onDelete }: VenueListProps) {
  if (venues.length === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground py-8">
        Нет площадок. Добавьте первую!
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {venues.map((venue) => {
        const eventCount = events.filter(
          (e) => e.venueId === venue.id
        ).length
        return (
          <div
            key={venue.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MapPinIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {venue.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {eventCount}{" "}
                {eventCount === 1
                  ? "мероприятие"
                  : eventCount < 5
                    ? "мероприятия"
                    : "мероприятий"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(venue)}
              >
                <EditIcon className="h-3 w-3" />
                <span className="sr-only">Редактировать</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(venue.id)}
              >
                <TrashIcon className="h-3 w-3" />
                <span className="sr-only">Удалить</span>
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
