"use client"

import { useRef, useCallback, useState } from "react"
import Map, {
  Marker,
  NavigationControl,
  GeolocateControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import type { Venue, ConcertEvent } from "@/lib/types"
import { MAP_CONFIG } from "@/lib/constants"
import { MapPinIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MoscowMapProps {
  venues: Venue[]
  events: ConcertEvent[]
  filteredEvents: ConcertEvent[]
  dateFilterActive?: boolean
  selectedVenueId?: string
  onMapClick?: (e: { lng: number; lat: number }) => void
  onVenueClick?: (venueId: string | null) => void
  pickingCoords?: boolean
  showFilters?: boolean
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
  showFilters = false,
}: MoscowMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null)


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

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Геолокация не поддерживается вашим браузером")
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lng: pos.coords.longitude, lat: pos.coords.latitude }
        setUserLocation(coords)
        mapRef.current?.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 14,
          duration: 1500
        })
      },
      (err) => {
        console.error("Ошибка геолокации:", err)
        alert("Не удалось определить местоположение. Проверьте разрешения в браузере.")
      },
      { enableHighAccuracy: true }
    )
  }, [])

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), [])
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), [])

  const venueHasEvents = (venueId: string) => eventCountByVenue[venueId] > 0

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: MAP_CONFIG.center[0],
          latitude: MAP_CONFIG.center[1],
          zoom: MAP_CONFIG.zoom,
        }}
        // Реактивный офсет: карта сама передвинет центр
        padding={
          typeof window !== 'undefined' && window.innerWidth < 768 
            ? { top: 0, bottom: showFilters ? 320 : 60, left: 0, right: 0 } 
            : { top: 0, bottom: 0, left: 0, right: showFilters ? 350 : 0 }
        }
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_CONFIG.style}
        attributionControl={false}
        onClick={handleMapClick}
        cursor={pickingCoords ? "crosshair" : undefined}
      >
        {/* User Location Marker */}
        {userLocation && (
          <Marker
            longitude={userLocation.lng}
            latitude={userLocation.lat}
            anchor="center"
          >
            <div className="relative flex h-6 w-6 items-center justify-center">
              <div className="absolute h-full w-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-blue-500 opacity-40"></div>
              <div className="relative h-3 w-3 rounded-full bg-blue-600 border-2 border-white shadow-lg"></div>
            </div>
          </Marker>
        )}

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

      {/* Custom UI Controls: Follows the filter panel top edge */}
      <div 
        className={cn(
          "fixed flex flex-col gap-2 pointer-events-auto transition-all duration-300 z-40",
          "right-4",
          // Мобилки: ровно над шторкой (50vh открытая, 3.5rem "хвостик")
          showFilters 
            ? "bottom-[calc(50vh+12px)]" 
            : "bottom-[calc(3.5rem+12px)]",
          
          // Десктоп: над верхней гранью сайдбара (56px от верха)
          "md:bottom-auto md:top-[calc(56px+12px)] md:right-6",
          showFilters && "md:right-[calc(320px+24px)]"
        )}
      >
        <button
          onClick={handleGeolocate}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/80 text-foreground shadow-lg backdrop-blur-md border border-border/10 transition-all hover:bg-background active:scale-95"
          title="Где я?"
        >
          <MapPinIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
