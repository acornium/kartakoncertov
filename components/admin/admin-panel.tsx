"use client"

import { useState } from "react"
import type { Venue, ConcertEvent } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { VenueForm } from "./venue-form"
import { EventForm } from "./event-form"
import { VenueList } from "./venue-list"
import { EventList } from "./event-list"
import {
  XIcon,
  PlusIcon,
  LogOutIcon,
  MapPinIcon,
  CalendarIcon,
} from "lucide-react"

interface AdminPanelProps {
  venues: Venue[]
  events: ConcertEvent[]
  onAddVenue: (venue: Omit<Venue, "id">) => void
  onUpdateVenue: (id: string, data: Partial<Venue>) => void
  onDeleteVenue: (id: string) => void
  onAddEvent: (event: Omit<ConcertEvent, "id">) => void
  onUpdateEvent: (id: string, data: Partial<ConcertEvent>) => void
  onDeleteEvent: (id: string) => void
  onClose: () => void
  onLogout: () => void
  onStartPickCoords: () => void
  pickingCoords: boolean
}

export function AdminPanel({
  venues,
  events,
  onAddVenue,
  onUpdateVenue,
  onDeleteVenue,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onClose,
  onLogout,
  onStartPickCoords,
  pickingCoords,
}: AdminPanelProps) {
  const [showVenueForm, setShowVenueForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [editingEvent, setEditingEvent] = useState<ConcertEvent | null>(null)

  return (
    <div className="pointer-events-auto flex h-full w-80 flex-col bg-background/90 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          Админ-панель
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground"
            onClick={onLogout}
          >
            <LogOutIcon className="h-3 w-3" />
            Выход
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Закрыть</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="venues" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 w-auto">
          <TabsTrigger value="venues" className="flex-1 gap-1 text-xs">
            <MapPinIcon className="h-3 w-3" />
            Площадки
          </TabsTrigger>
          <TabsTrigger value="events" className="flex-1 gap-1 text-xs">
            <CalendarIcon className="h-3 w-3" />
            Мероприятия
          </TabsTrigger>
        </TabsList>

        <TabsContent value="venues" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-3 p-4">
              {showVenueForm || editingVenue ? (
                <VenueForm
                  venue={editingVenue}
                  onSubmit={(data) => {
                    if (editingVenue) {
                      onUpdateVenue(editingVenue.id, data)
                    } else {
                      onAddVenue(data)
                    }
                    setShowVenueForm(false)
                    setEditingVenue(null)
                  }}
                  onCancel={() => {
                    setShowVenueForm(false)
                    setEditingVenue(null)
                  }}
                  onPickCoords={onStartPickCoords}
                  pickingCoords={pickingCoords}
                />
              ) : (
                <>
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => setShowVenueForm(true)}
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Добавить площадку
                  </Button>
                  <VenueList
                    venues={venues}
                    events={events}
                    onEdit={setEditingVenue}
                    onDelete={onDeleteVenue}
                  />
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="events" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-3 p-4">
              {showEventForm || editingEvent ? (
                <EventForm
                  event={editingEvent}
                  venues={venues}
                  onSubmit={(data) => {
                    if (editingEvent) {
                      onUpdateEvent(editingEvent.id, data)
                    } else {
                      onAddEvent(data)
                    }
                    setShowEventForm(false)
                    setEditingEvent(null)
                  }}
                  onCancel={() => {
                    setShowEventForm(false)
                    setEditingEvent(null)
                  }}
                />
              ) : (
                <>
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => setShowEventForm(true)}
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Добавить мероприятие
                  </Button>
                  <EventList
                    events={events}
                    venues={venues}
                    onEdit={setEditingEvent}
                    onDelete={onDeleteEvent}
                  />
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
