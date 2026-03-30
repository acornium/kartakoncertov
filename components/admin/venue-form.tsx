"use client"

import { useState, useEffect } from "react"
import type { Venue } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CrosshairIcon } from "lucide-react"

interface VenueFormProps {
  venue?: Venue | null
  onSubmit: (data: Omit<Venue, "id">) => void
  onCancel: () => void
  onPickCoords: () => void
  pickingCoords: boolean
}

export function VenueForm({
  venue,
  onSubmit,
  onCancel,
  onPickCoords,
  pickingCoords,
}: VenueFormProps) {
  const [name, setName] = useState(venue?.name || "")
  const [address, setAddress] = useState(venue?.address || "")
  const [coords, setCoords] = useState(
    venue?.latitude !== undefined && venue?.longitude !== undefined
      ? `${venue.latitude.toFixed(6)}, ${venue.longitude.toFixed(6)}`
      : ""
  )
  const [capacity, setCapacity] = useState(venue?.capacity?.toString() || "")
  const [description, setDescription] = useState(venue?.description || "")

  // Listen for coord pick events
  useEffect(() => {
    const handler = (e: CustomEvent<{ lat: number; lng: number }>) => {
      setCoords(`${e.detail.lat.toFixed(6)}, ${e.detail.lng.toFixed(6)}`)
    }
    window.addEventListener("coord-picked" as string, handler as EventListener)
    return () =>
      window.removeEventListener(
        "coord-picked" as string,
        handler as EventListener
      )
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !address || !coords) return
    const parts = coords.split(",").map((p) => p.trim()).filter(Boolean)
    if (parts.length !== 2) return
    const lat = parseFloat(parts[0])
    const lng = parseFloat(parts[1])
    if (Number.isNaN(lat) || Number.isNaN(lng)) return
    onSubmit({
      name,
      address,
      latitude: lat,
      longitude: lng,
      capacity: capacity ? parseInt(capacity) : undefined,
      description: description || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold text-foreground">
        {venue ? "Редактировать площадку" : "Новая площадка"}
      </h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="v-name" className="text-xs">
          Название *
        </Label>
        <Input
          id="v-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например, Crocus City Hall"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="v-address" className="text-xs">
          Адрес *
        </Label>
        <Input
          id="v-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="ул. Примерная, 1"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Координаты *</Label>
          <Button
            type="button"
            variant={pickingCoords ? "default" : "secondary"}
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={onPickCoords}
          >
            <CrosshairIcon className="h-3 w-3" />
            {pickingCoords ? "Кликните на карту" : "Выбрать на карте"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            value={coords}
            onChange={(e) => setCoords(e.target.value)}
            placeholder="55.751244, 37.618423"
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="v-capacity" className="text-xs">
          Вместимость
        </Label>
        <Input
          id="v-capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="1000"
          type="number"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="v-desc" className="text-xs">
          Описание
        </Label>
        <Input
          id="v-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Краткое описание площадки"
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
          {venue ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </form>
  )
}
