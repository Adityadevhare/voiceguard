import {
  Activity,
  AudioWaveform,
  BarChart3,
  History,
  LayoutGrid,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import type { Route } from "@/lib/router"

export interface NavItem {
  label: string
  route: Route
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", route: "/overview", icon: LayoutGrid },
  { label: "Voice Check", route: "/voice-check", icon: AudioWaveform },
  { label: "History", route: "/history", icon: History },
  { label: "Analytics", route: "/analytics", icon: BarChart3 },
  { label: "Verification", route: "/verification", icon: ShieldCheck },
  { label: "Activity", route: "/activity", icon: Activity },
  { label: "Settings", route: "/settings", icon: Settings },
]