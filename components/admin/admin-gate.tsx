"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ADMIN_PASSWORD } from "@/lib/constants"
import { ShieldAlertIcon } from "lucide-react"

interface AdminGateProps {
  onAuthenticated: () => void
  onCancel: () => void
}

export function AdminGate({ onAuthenticated, onCancel }: AdminGateProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      onAuthenticated()
      setError(false)
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <ShieldAlertIcon className="h-6 w-6 text-primary" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-foreground">
          Вход в админ-панель
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Введите пароль администратора
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-pass" className="text-xs">
            Пароль
          </Label>
          <Input
            id="admin-pass"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(false)
            }}
            placeholder="Введите пароль..."
            autoFocus
          />
          {error && (
            <p className="text-xs text-destructive">Неверный пароль</p>
          )}
        </div>
        <div className="flex gap-2">
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
            Войти
          </Button>
        </div>
      </form>
    </div>
  )
}
