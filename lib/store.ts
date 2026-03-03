"use client"

import { useState, useCallback, useMemo } from "react"
import type { Venue, ConcertEvent, Filters } from "./types"
import { SEED_VENUES, SEED_EVENTS } from "./constants"

const VENUES_KEY = "moscow-concerts-venues"
const EVENTS_KEY = "moscow-concerts-events"
const SEEDED_KEY = "moscow-concerts-seeded"

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, data: T) {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(data))
}

function seedIfNeeded() {
  if (typeof window === "undefined") return
  if (localStorage.getItem(SEEDED_KEY)) return
  saveToStorage(VENUES_KEY, SEED_VENUES)
  saveToStorage(EVENTS_KEY, SEED_EVENTS)
  localStorage.setItem(SEEDED_KEY, "true")
}

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>(() => {
    if (typeof window === "undefined") return []
    seedIfNeeded()
    return loadFromStorage<Venue[]>(VENUES_KEY, [])
  })

  const persist = useCallback((updated: Venue[]) => {
    setVenues(updated)
    saveToStorage(VENUES_KEY, updated)
  }, [])

  const addVenue = useCallback(
    (venue: Omit<Venue, "id">) => {
      const newVenue = { ...venue, id: generateId() }
      const updated = [...venues, newVenue]
      persist(updated)
      return newVenue
    },
    [venues, persist]
  )

  const updateVenue = useCallback(
    (id: string, data: Partial<Venue>) => {
      const updated = venues.map((v) => (v.id === id ? { ...v, ...data } : v))
      persist(updated)
    },
    [venues, persist]
  )

  const deleteVenue = useCallback(
    (id: string) => {
      persist(venues.filter((v) => v.id !== id))
    },
    [venues, persist]
  )

  return { venues, addVenue, updateVenue, deleteVenue }
}

export function useEvents() {
  const [events, setEvents] = useState<ConcertEvent[]>(() => {
    if (typeof window === "undefined") return []
    seedIfNeeded()
    return loadFromStorage<ConcertEvent[]>(EVENTS_KEY, [])
  })

  const persist = useCallback((updated: ConcertEvent[]) => {
    setEvents(updated)
    saveToStorage(EVENTS_KEY, updated)
  }, [])

  const addEvent = useCallback(
    (event: Omit<ConcertEvent, "id">) => {
      const newEvent = { ...event, id: generateId() }
      const updated = [...events, newEvent]
      persist(updated)
      return newEvent
    },
    [events, persist]
  )

  const updateEvent = useCallback(
    (id: string, data: Partial<ConcertEvent>) => {
      const updated = events.map((e) =>
        e.id === id ? { ...e, ...data } : e
      )
      persist(updated)
    },
    [events, persist]
  )

  const deleteEvent = useCallback(
    (id: string) => {
      persist(events.filter((e) => e.id !== id))
    },
    [events, persist]
  )

  return { events, addEvent, updateEvent, deleteEvent }
}

export function useFilteredEvents(
  events: ConcertEvent[],
  filters: Filters,
  venues: Venue[] = []
) {
  return useMemo(() => {
    const text = filters.query?.toLowerCase().trim() || ""

    return events.filter((event) => {
      // Date filter
      if (filters.dateFrom && event.date < filters.dateFrom) return false
      if (filters.dateTo && event.date > filters.dateTo) return false

      // Genre filter
      if (filters.genres.length > 0 && !filters.genres.includes(event.genre))
        return false

      // Venue filter
      if (filters.venueId && event.venueId !== filters.venueId) return false

      // Price filter (range intersection)
      const eventMin = event.price
      const eventMax = event.priceMax ?? event.price
      if (eventMax < filters.priceMin) return false
      if (eventMin > filters.priceMax) return false

      // Text query (artist or venue name)
      if (text) {
        const artistMatch = event.artist.toLowerCase().includes(text)
        const venue = venues.find((v) => v.id === event.venueId)
        const venueMatch = venue?.name.toLowerCase().includes(text)
        if (!artistMatch && !venueMatch) return false
      }

      return true
    })
  }, [events, filters, venues])
}
