"use client"

import { useState } from "react"
import type { Venue, ConcertEvent, Genre } from "@/lib/types"
import { ALL_GENRES, GENRE_LABELS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EventFormProps {
  event?: ConcertEvent | null
  venues: Venue[]
  onSubmit: (data: Omit<ConcertEvent, "id">) => void
  onCancel: () => void
}

export function EventForm({
  event,
  venues,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const [venueId, setVenueId] = useState(event?.venueId || "")
  const [title, setTitle] = useState(event?.title || "")
  const [artist, setArtist] = useState(event?.artist || "")
  const [genre, setGenre] = useState<Genre>(event?.genre || "rock")
  const [date, setDate] = useState(event?.date || "")
  const [time, setTime] = useState(event?.time || "19:00")
  const [price, setPrice] = useState(event?.price?.toString() || "")
  const [priceMax, setPriceMax] = useState(event?.priceMax?.toString() || "")
  const [description, setDescription] = useState(event?.description || "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!venueId || !title || !artist || !date || !price) return
    onSubmit({
      venueId,
      title,
      artist,
      genre,
      date,
      time,
      price: parseInt(price),
      priceMax: priceMax ? parseInt(priceMax) : undefined,
      description: description || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold text-foreground">
        {event ? "Редактировать мероприятие" : "Новое мероприятие"}
      </h3>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Площадка *</Label>
        <Select value={venueId} onValueChange={setVenueId} required>
          <SelectTrigger className="w-full text-xs">
            <SelectValue placeholder="Выберите площадку" />
          </SelectTrigger>
          <SelectContent>
            {venues.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="e-title" className="text-xs">
          Название *
        </Label>
        <Input
          id="e-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Рок-фестиваль 2026"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="e-artist" className="text-xs">
          Исполнитель *
        </Label>
        <Input
          id="e-artist"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Название группы или артиста"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Жанр *</Label>
        <Select
          value={genre}
          onValueChange={(v) => setGenre(v as Genre)}
        >
          <SelectTrigger className="w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_GENRES.map((g) => (
              <SelectItem key={g} value={g}>
                {GENRE_LABELS[g]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="e-date" className="text-xs">
            Дата *
          </Label>
          <Input
            id="e-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="e-time" className="text-xs">
            Время *
          </Label>
          <Input
            id="e-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="e-price" className="text-xs">
            Цена от *
          </Label>
          <Input
            id="e-price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="2000"
            required
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="e-pricemax" className="text-xs">
            Цена до
          </Label>
          <Input
            id="e-pricemax"
            type="number"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="8000"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="e-desc" className="text-xs">
          Описание
        </Label>
        <Input
          id="e-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Краткое описание"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={onCancel}
        >
          Отмена
        </Button>
        <Button type="submit" size="sm" className="flex-1">
          {event ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </form>
  )
}
