"use client"

import { useRef, useCallback, useState, useEffect } from "react"
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
  markerEvents?: ConcertEvent[]
  bottomOverlayPx?: number
  dateFilterActive?: boolean
  selectedVenueId?: string
  onMapClick?: (e: { lng: number; lat: number }) => void
  onVenueClick?: (venueId: string | null) => void
  pickingCoords?: boolean
  showFilters?: boolean
  isSearchActive?: boolean
}

export function MoscowMap({
  venues,
  events,
  filteredEvents,
  markerEvents,
  bottomOverlayPx = 0,
  dateFilterActive = false,
  selectedVenueId,
  onMapClick,
  onVenueClick,
  pickingCoords,
  showFilters = false,
  isSearchActive = false,
}: MoscowMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null)


  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (pickingCoords && onMapClick) {
        onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat })
        return
      }
      if (!pickingCoords && onVenueClick) {
        onVenueClick(null)
      }
    },
    [pickingCoords, onMapClick, onVenueClick]
  )

  const eventsForMarkers = markerEvents ?? filteredEvents
  // Get event count per venue from marker events
  const eventCountByVenue = eventsForMarkers.reduce(
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

  useEffect(() => {
    if (!selectedVenueId) return
    const venue = venues.find((v) => v.id === selectedVenueId)
    if (!venue) return
    mapRef.current?.flyTo({
      center: [venue.longitude, venue.latitude],
      zoom: mapRef.current?.getZoom() ?? MAP_CONFIG.zoom,
      duration: 600,
      essential: true,
    })
  }, [selectedVenueId, venues])

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
            ? { top: 0, bottom: bottomOverlayPx || 60, left: 0, right: 0 }
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
          const isSelected = venue.id === selectedVenueId

          // Если нет событий и клуб не выбран — скрываем, только когда нет активного выбора
          if (count === 0 && !isSelected) return null

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
                className={cn(
                  "group relative flex h-10 w-10 items-center justify-center transition-all duration-300",
                  selectedVenueId && !isSelected && "opacity-35"
                )}
                aria-label={`${venue.name}: ${count} events`}
              >
                {/* Circle marker */}
                <span
                  className={cn(
                    "relative flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 backdrop-blur-md border shadow-xl group-hover:scale-110 group-active:scale-90",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary/50 shadow-primary/40 scale-110 ring-4 ring-primary/10"
                      : "bg-cyan-400/80 border-cyan-200/70 shadow-cyan-400/40"
                  )}
                >
                  {isSelected && (
                    <span className="absolute inset-0 rounded-full animate-[pulseGlow_3.2s_ease-in-out_infinite] shadow-[0_0_0_2px_rgba(255,255,255,0.25),0_0_20px_rgba(0,190,255,0.6)]" />
                  )}
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    isSelected ? "bg-white" : "bg-white"
                  )} />
                </span>

                {/* Name Label - Floating underneath */}
                <span className={cn(
                  "pointer-events-none absolute top-full mt-2 w-max max-w-28 truncate rounded-lg bg-background/60 px-2 py-0.5 text-center text-[10px] font-semibold text-foreground backdrop-blur-sm shadow-sm border border-white/10 transition-opacity",
                  isSelected ? "opacity-100 ring-1 ring-primary/20" : "opacity-0 group-hover:opacity-100"
                )}>
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
          // Прячем, если активен поиск
          isSearchActive ? "opacity-0 pointer-events-none scale-95" : "opacity-100",
          // Мобилки: ровно над шторкой (42vh открытая, 3.5rem "хвостик")
          showFilters 
            ? "bottom-[calc(42vh+12px)]" 
            : "bottom-[calc(3.5rem+12px)]",
          
          // Десктоп: над верхней гранью сайдбара (80px от верха - pt-20)
          "md:bottom-auto md:top-[calc(80px+12px)] md:right-6",
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
