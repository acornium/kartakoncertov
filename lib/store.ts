"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import type { Venue, ConcertEvent, Filters } from "./types"
import { SEED_VENUES, SEED_EVENTS } from "./constants"

const VENUES_KEY = "moscow-concerts-venues"
const EVENTS_KEY = "moscow-concerts-events"
const SEEDED_KEY = "moscow-concerts-seeded-v3"

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
      if (filters.date && event.date !== filters.date) return false

      // Genre filter
      if (filters.genres.length > 0 && !filters.genres.includes(event.genre))
        return false

      // Venue filter (set by clicking a map marker)
      if (filters.venueId && event.venueId !== filters.venueId) return false

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

type ScraperApiEvent = {
  id?: number
  title?: string | null
  date?: string | null
  venue?: string | null
  link?: string | null
  source?: string | null
  image_url?: string | null
  image_path?: string | null
  image_local_url?: string | null
  description?: string | null
}

type ScraperApiResponse = {
  events: ScraperApiEvent[]
}

const DEFAULT_SCRAPER_BASE =
  process.env.NEXT_PUBLIC_SCRAPER_API_BASE ??
  "http://localhost:8081/scraper-api"

function resolveScraperUrl(value?: string | null) {
  const raw = (value ?? "").trim()
  if (!raw) return undefined

  if (/^https?:\/\//i.test(raw)) return raw

  const base = DEFAULT_SCRAPER_BASE.replace(/\/+$/, "")
  const baseOrigin = /^https?:\/\//i.test(base) ? new URL(base).origin : ""

  if (raw.startsWith("/")) {
    return baseOrigin ? `${baseOrigin}${raw}` : raw
  }

  return `${base}/${raw.replace(/^\/+/, "")}`
}

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase()
}

function preferScraperValue(
  localValue?: string | null,
  scraperValue?: string | null
) {
  const localText = (localValue ?? "").trim()
  if (localText) return localValue ?? undefined

  const scraperText = (scraperValue ?? "").trim()
  return scraperText ? scraperValue ?? undefined : undefined
}

function findVenueId(venues: Venue[], venueName?: string | null) {
  const needle = normalizeText(venueName)
  if (!needle) return null
  const match = venues.find((v) => normalizeText(v.name) === needle)
  return match?.id ?? null
}

function makeExternalId(event: ScraperApiEvent, venueId: string) {
  const key = [
    normalizeText(event.title),
    normalizeText(event.date),
    venueId,
    normalizeText(event.source),
  ].join("|")
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  return `scr_${Math.abs(hash)}`
}

function mapScraperEvent(
  event: ScraperApiEvent,
  venues: Venue[]
): ConcertEvent | null {
  const title = (event.title ?? "").trim()
  if (!title) return null

  const venueId = findVenueId(venues, event.venue)
  if (!venueId) return null

  const rawDate = (event.date ?? "").trim()
  const date = rawDate.length >= 10 ? rawDate.slice(0, 10) : ""
  if (!date) return null

  return {
    id: makeExternalId(event, venueId),
    venueId,
    title,
    artist: title,
    genre: "other",
    date,
    time: "19:00",
    price: 0,
    priceMax: undefined,
    description: event.description ?? undefined,
    link: event.link ?? undefined,
    imageUrl: resolveScraperUrl(event.image_local_url ?? event.image_url),
    source: event.source ?? undefined,
  }
}

export function mergeEvents(
  localEvents: ConcertEvent[],
  externalEvents: ConcertEvent[]
) {
  const makeKey = (event: ConcertEvent) =>
    [
      normalizeText(event.title),
      event.date,
      event.venueId,
    ].join("|")

  const localKeys = new Set(localEvents.map(makeKey))
  const externalByKey = new Map(
    externalEvents.map((event) => [
      makeKey(event),
      event,
    ])
  )

  const merged = localEvents.map((event) => {
    const key = makeKey(event)
    const external = externalByKey.get(key)
    if (!external) return event

    return {
      ...event,
      description: preferScraperValue(event.description, external.description),
      link: preferScraperValue(event.link, external.link),
      imageUrl: preferScraperValue(event.imageUrl, external.imageUrl),
      source: preferScraperValue(event.source, external.source),
    }
  })

  for (const event of externalEvents) {
    if (!localKeys.has(makeKey(event))) merged.push(event)
  }

  return merged
}

export function useScraperEvents(venues: Venue[]) {
  const [events, setEvents] = useState<ConcertEvent[]>([])
  const [unmatchedVenues, setUnmatchedVenues] = useState<string[]>([])

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `${DEFAULT_SCRAPER_BASE}/events?limit=500&offset=0`
      )
      if (!response.ok) return
      const data = (await response.json()) as ScraperApiResponse
      const mapped: ConcertEvent[] = []
      const missingVenues: string[] = []

      for (const item of data.events ?? []) {
        const venueId = findVenueId(venues, item.venue)
        if (!venueId) {
          if (item.venue && !missingVenues.includes(item.venue)) {
            missingVenues.push(item.venue)
          }
          continue
        }
        const mappedEvent = mapScraperEvent(item, venues)
        if (mappedEvent) mapped.push(mappedEvent)
      }

      setEvents(mapped)
      setUnmatchedVenues(missingVenues)
    } catch {
      // ignore network errors for now
    }
  }, [venues])

  useEffect(() => {
    if (venues.length === 0) return
    void load()
  }, [venues, load])

  return {
    events,
    unmatchedVenues,
    refresh: load,
  }
}
