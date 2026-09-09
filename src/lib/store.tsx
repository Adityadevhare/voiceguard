import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { VoiceCheckRecord, VoiceStatus } from "@/types/voice"

export interface ActivityEntry {
  id: string
  text: string
  timestamp: number
}

interface StoreContextValue {
  records: VoiceCheckRecord[]
  activities: ActivityEntry[]
  addRecord: (status: VoiceStatus, at?: number) => void
  addActivity: (text: string) => void
  clearHistory: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

const RECORDS_KEY = "voice-check-records"
const ACTIVITIES_KEY = "voice-check-activities"

const DAY = 86400000
const HOUR = 3600000

function seedRecords(): VoiceCheckRecord[] {
  const now = Date.now()
  return [
    { id: "seed-1", status: "human", timestamp: now - 2 * HOUR },
    { id: "seed-2", status: "uncertain", timestamp: now - 6 * HOUR },
    { id: "seed-3", status: "human", timestamp: now - DAY - 4 * HOUR },
    { id: "seed-4", status: "human", timestamp: now - DAY - 12 * HOUR },
    { id: "seed-5", status: "suspicious", timestamp: now - 2 * DAY - 3 * HOUR },
    { id: "seed-6", status: "human", timestamp: now - 3 * DAY - 8 * HOUR },
  ]
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<VoiceCheckRecord[]>(() =>
    load(RECORDS_KEY, seedRecords()),
  )
  const [activities, setActivities] = useState<ActivityEntry[]>(() =>
    load(ACTIVITIES_KEY, []),
  )

  useEffect(() => {
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  }, [records])

  useEffect(() => {
    window.localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities))
  }, [activities])

  const addRecord = useCallback((status: VoiceStatus, at?: number) => {
    const record: VoiceCheckRecord = {
      id: makeId(),
      status,
      timestamp: at ?? Date.now(),
    }
    setRecords((prev) => [record, ...prev])
  }, [])

  const addActivity = useCallback((text: string) => {
    const entry: ActivityEntry = { id: makeId(), text, timestamp: Date.now() }
    setActivities((prev) => [entry, ...prev].slice(0, 50))
  }, [])

  const clearHistory = useCallback(() => {
    setRecords([])
  }, [])

  const value = useMemo(
    () => ({ records, activities, addRecord, addActivity, clearHistory }),
    [records, activities, addRecord, addActivity, clearHistory],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error("useStore must be used within a StoreProvider")
  }
  return ctx
}
