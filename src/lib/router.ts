import { useCallback, useEffect, useState } from "react"

export const ROUTES = {
  overview: "/overview",
  "voice-check": "/voice-check",
  history: "/history",
  analytics: "/analytics",
  verification: "/verification",
  activity: "/activity",
  settings: "/settings",
} as const

export type Route = (typeof ROUTES)[keyof typeof ROUTES]

function readHash(): Route {
  const hash = window.location.hash.replace(/^#/, "")
  const match = (Object.values(ROUTES) as string[]).find((r) => r === hash)
  return (match as Route) ?? ROUTES["voice-check"]
}

export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(readHash)

  useEffect(() => {
    const onHashChange = () => setRoute(readHash())
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  const navigate = useCallback((next: Route) => {
    window.location.hash = next
    setRoute(next)
  }, [])

  return [route, navigate]
}