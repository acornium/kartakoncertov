"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import type { Filters } from "@/lib/types"
import { useVenues, useEvents, useFilteredEvents } from "@/lib/store"
import { DEFAULT_FILTERS, getTodayISO } from "@/lib/constants"
import { Header } from "@/components/header"
import { FilterPanel } from "@/components/filters/filter-panel"
import { AdminGate } from "@/components/admin/admin-gate"
import { AdminPanel } from "@/components/admin/admin-panel"

const MoscowMap = dynamic(
  () =>
    import("@/components/map/moscow-map").then((mod) => mod.MoscowMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    ),
  }
)

export default function HomePage() {
  const todayISO = getTodayISO()
  // Data store
  const {
    venues,
    addVenue,
    updateVenue,
    deleteVenue,
  } = useVenues()
  const {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useEvents()

  // UI state
  const [showFilters, setShowFilters] = useState(true)
  const [showAdmin, setShowAdmin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    date: todayISO,
  }))
  const [pickingCoords, setPickingCoords] = useState(false)

  // Filtered events
  const filteredEvents = useFilteredEvents(events, filters, venues)
  const dateFilterActive = Boolean(filters.date)

  // Count active filters
  const filterCount =
    (filters.genres.length > 0 ? 1 : 0) +
    (filters.date && filters.date !== todayISO ? 1 : 0) +
    (filters.query && filters.query.trim() !== "" ? 1 : 0) +
    (filters.venueId ? 1 : 0)

  const adminEnabled =
    process.env.NEXT_PUBLIC_ENABLE_ADMIN === "true"

  const handleToggleAdmin = useCallback(() => {
    if (!adminEnabled) return
    if (isAdmin) {
      setShowAdmin((prev) => !prev)
    } else {
      setShowAdmin(true)
    }
  }, [adminEnabled, isAdmin])

  const handleMapClick = useCallback(
    (coords: { lng: number; lat: number }) => {
      if (pickingCoords) {
        window.dispatchEvent(
          new CustomEvent("coord-picked", {
            detail: { lat: coords.lat, lng: coords.lng },
          })
        )
        setPickingCoords(false)
      }
    },
    [pickingCoords]
  )

  // Venue click on map → toggle venueId filter
  const handleVenueClick = useCallback((venueId: string | null) => {
    setFilters((prev) => ({ ...prev, venueId: venueId ?? undefined }))
  }, [])

  const filterPanelProps = {
    filters,
    onFiltersChange: setFilters,
    events: filteredEvents,
    venues,
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Map layer */}
      <div className="absolute inset-0">
        <MoscowMap
          venues={venues}
          events={events}
          filteredEvents={filteredEvents}
          dateFilterActive={dateFilterActive}
          selectedVenueId={filters.venueId}
          onMapClick={handleMapClick}
          onVenueClick={handleVenueClick}
          pickingCoords={pickingCoords}
        />
      </div>

      {/* Header overlay */}
      <Header
        isAdmin={isAdmin}
        showFilters={showFilters}
        showAdmin={showAdmin}
        adminEnabled={adminEnabled}
        onToggleFilters={() => setShowFilters((prev) => !prev)}
        onToggleAdmin={handleToggleAdmin}
        filterCount={filterCount}
      />

      {/* Picking coords banner */}
      {pickingCoords && (
        <div className="pointer-events-none fixed top-14 right-0 left-0 z-20 flex justify-center">
          <div className="pointer-events-auto rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg">
            Кликните на карту, чтобы выбрать координаты
          </div>
        </div>
      )}

      {/* Filter panel (desktop right) */}
      <div
        className={`pointer-events-none fixed top-0 bottom-0 right-0 z-10 hidden transition-transform duration-300 md:block ${
          showFilters ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full pt-14">
          <FilterPanel
            {...filterPanelProps}
            variant="side"
          />
        </div>
      </div>

      {/* Filter panel (mobile bottom) */}
      <div
        className={`fixed right-0 bottom-0 left-0 z-10 transition-transform duration-300 md:hidden ${
          showFilters ? "translate-y-0" : "translate-y-[calc(100%-3.5rem)]"
        }`}
      >
        <div className="pointer-events-auto">
          <FilterPanel
            {...filterPanelProps}
            variant="bottom"
            open={showFilters}
            peek
            onPeekOpen={() => setShowFilters(true)}
            onRequestOpen={() => setShowFilters(true)}
            onRequestClose={() => setShowFilters(false)}
            filterCount={filterCount}
          />
        </div>
      </div>

      {/* Admin panel (right) */}
      {adminEnabled && (
      <div
        className={`pointer-events-none fixed top-0 right-0 bottom-0 z-10 transition-transform duration-300 ${
          showAdmin ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full pt-14">
          {isAdmin ? (
            <AdminPanel
              venues={venues}
              events={events}
              onAddVenue={addVenue}
              onUpdateVenue={updateVenue}
              onDeleteVenue={deleteVenue}
              onAddEvent={addEvent}
              onUpdateEvent={updateEvent}
              onDeleteEvent={deleteEvent}
              onClose={() => setShowAdmin(false)}
              onLogout={() => {
                setIsAdmin(false)
                setShowAdmin(false)
              }}
              onStartPickCoords={() => setPickingCoords(true)}
              pickingCoords={pickingCoords}
            />
          ) : (
            <div className="pointer-events-auto w-80 bg-background/90 shadow-2xl backdrop-blur-xl">
              <AdminGate
                onAuthenticated={() => setIsAdmin(true)}
                onCancel={() => setShowAdmin(false)}
              />
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
