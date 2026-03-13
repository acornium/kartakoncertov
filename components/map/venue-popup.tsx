"use client"

import type { Venue, ConcertEvent } from "@/lib/types"
import { EventCard } from "@/components/event-card"
import { MapPinIcon, UsersIcon } from "lucide-react"

interface VenuePopupProps {
  venue: Venue
  events: ConcertEvent[]
}

export function VenuePopup({ venue, events }: VenuePopupProps) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <div className="flex flex-col gap-3 p-1">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{venue.name}</h3>
        <div className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
          <MapPinIcon className="h-3 w-3 shrink-0" />
          <span>{venue.address}</span>
        </div>
        {venue.capacity && (
          <div className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
            <UsersIcon className="h-3 w-3 shrink-0" />
            <span>{"Вместимость: "}{venue.capacity.toLocaleString("ru-RU")}</span>
          </div>
        )}
      </div>

      {sortedEvents.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-medium text-muted-foreground">
            {"Мероприятия ("}{sortedEvents.length}{"):"}
          </p>
          <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {sortedEvents.map((event) => (
              <EventCard key={event.id} event={event} compact />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground">
          Нет предстоящих мероприятий
        </p>
      )}
    </div>
  )
}
