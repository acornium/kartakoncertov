export type Genre =
  | "rock"
  | "pop"
  | "electronic"
  | "jazz"
  | "classical"
  | "hip-hop"
  | "metal"
  | "folk"
  | "other"

export interface Venue {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  capacity?: number
  description?: string
}

export interface ConcertEvent {
  id: string
  venueId: string
  title: string
  artist: string
  genre: Genre
  date: string // ISO date string YYYY-MM-DD
  time: string // e.g. "19:00"
  price: number
  priceMax?: number
  description?: string
}

export interface Filters {
  dateFrom?: string
  dateTo?: string
  genres: Genre[]
  venueId?: string
  priceMin: number
  priceMax: number
}
