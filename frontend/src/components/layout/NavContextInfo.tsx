import { useEffect, useState } from 'react'
import { MapPin, Thermometer } from 'lucide-react'

const DEFAULT_COORDS = { lat: 24.4539, lon: 54.3773, label: 'Abu Dhabi' }

async function fetchWeather(lat: number, lon: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`,
    )
    if (!res.ok) return null
    const data = await res.json()
    const temp = data?.current?.temperature_2m
    return typeof temp === 'number' ? Math.round(temp) : null
  } catch {
    return null
  }
}

async function resolvePlaceName(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    )
    if (!res.ok) return DEFAULT_COORDS.label
    const data = await res.json()
    return data.city || data.locality || data.principalSubdivision || DEFAULT_COORDS.label
  } catch {
    return DEFAULT_COORDS.label
  }
}

export function NavContextInfo() {
  const [time, setTime] = useState('')
  const [place, setPlace] = useState(DEFAULT_COORDS.label)
  const [temperature, setTemperature] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => {
      setTime(
        new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date()),
      )
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async (lat: number, lon: number, label?: string) => {
      const [temp, name] = await Promise.all([
        fetchWeather(lat, lon),
        label ? Promise.resolve(label) : resolvePlaceName(lat, lon),
      ])
      if (cancelled) return
      setPlace(name)
      setTemperature(temp)
    }

    if (!navigator.geolocation) {
      void load(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, DEFAULT_COORDS.label)
      return () => { cancelled = true }
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => void load(pos.coords.latitude, pos.coords.longitude),
      () => void load(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, DEFAULT_COORDS.label),
      { timeout: 8000, maximumAge: 600_000 },
    )

    return () => { cancelled = true }
  }, [])

  return (
    <div
      className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"
      title="Local time, location, and temperature"
    >
      <span className="font-medium tabular-nums text-foreground">{time || '--:--'}</span>
      <span className="text-border">/</span>
      <span className="inline-flex max-w-[120px] items-center gap-1 truncate">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        {place}
      </span>
      <span className="text-border">/</span>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Thermometer className="h-3.5 w-3.5 shrink-0" />
        {temperature != null ? `${temperature}°C` : '--°C'}
      </span>
    </div>
  )
}
