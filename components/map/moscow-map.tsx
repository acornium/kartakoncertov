"use client"

import { useRef, useCallback, useState } from "react"
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import type { Venue, ConcertEvent } from "@/lib/types"
import { MAP_CONFIG } from "@/lib/constants"
import { MapPinIcon } from "lucide-react"

interface MoscowMapProps {
  venues: Venue[]
  events: ConcertEvent[]
  filteredEvents: ConcertEvent[]
  dateFilterActive?: boolean
  selectedVenueId?: string
  onMapClick?: (e: { lng: number; lat: number }) => void
  onVenueClick?: (venueId: string | null) => void
  pickingCoords?: boolean
}

export function MoscowMap({
  venues,
  events,
  filteredEvents,
  dateFilterActive = false,
  selectedVenueId,
  onMapClick,
  onVenueClick,
  pickingCoords,
}: MoscowMapProps) {
  const mapRef = useRef<MapRef>(null)

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (pickingCoords && onMapClick) {
        onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat })
      }
    },
    [pickingCoords, onMapClick]
  )

  // Get event count per venue from filtered events
  const eventCountByVenue = filteredEvents.reduce(
    (acc, event) => {
      acc[event.venueId] = (acc[event.venueId] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const venueHasEvents = (venueId: string) => eventCountByVenue[venueId] > 0

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: MAP_CONFIG.center[0],
        latitude: MAP_CONFIG.center[1],
        zoom: MAP_CONFIG.zoom,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAP_CONFIG.style}
      attributionControl={false}
      onClick={handleMapClick}
      cursor={pickingCoords ? "crosshair" : undefined}
    >
      <NavigationControl position="bottom-right" />

      {venues.map((venue) => {
        const count = eventCountByVenue[venue.id] || 0
        const hasEvents = venueHasEvents(venue.id)
        const dimmed = selectedVenueId
          ? venue.id !== selectedVenueId
          : dateFilterActive
          ? !hasEvents
          : filteredEvents.length > 0
          ? !hasEvents
          : false

        const isSelected = venue.id === selectedVenueId

        return (
          <Marker
            key={venue.id}
            longitude={venue.longitude}
            latitude={venue.latitude}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              if (!pickingCoords && onVenueClick) {
                // toggle: click same venue again → deselect
                onVenueClick(isSelected ? null : venue.id)
              }
            }}
          >
            <button
              className={`group relative flex h-9 w-9 items-center justify-center transition-all duration-200 ${
                dimmed ? "opacity-30" : "opacity-100"
              }`}
              aria-label={`${venue.name}: ${count} events`}
            >
              {count > 0 && (
                <span className="absolute -top-2 -right-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all group-hover:scale-110 ${
                  isSelected
                    ? "bg-primary text-primary-foreground ring-2 ring-white ring-offset-1 ring-offset-primary scale-110"
                    : "bg-primary text-primary-foreground shadow-primary/30"
                }`}
              >
                <MapPinIcon className="h-4 w-4" />
              </span>
              <span className="pointer-events-none absolute top-full mt-1 w-max max-w-28 truncate rounded bg-background/80 px-1.5 py-0.5 text-center text-[10px] font-medium text-foreground backdrop-blur-sm">
                {venue.name}
              </span>
            </button>
          </Marker>
        )
      })}
    </Map>
  )
}
