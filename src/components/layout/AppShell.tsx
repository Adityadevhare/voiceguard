import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Menu, Moon, Sun, X } from "lucide-react"
import { useTheme } from "@/lib/theme"
import { NAV_ITEMS } from "@/lib/navigation"
import type { Route } from "@/lib/router"
import { cn } from "@/utils/cn"

interface AppShellProps {
  route: Route
  onNavigate: (route: Route) => void
  children: React.ReactNode
}

export function AppShell({ route, onNavigate, children }: AppShellProps) {
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [menuOpen])

  // A navigation (including an external route change) closes the drawer.
  useEffect(() => {
    const closeMenu = () => setMenuOpen(false)
    window.addEventListener("hashchange", closeMenu)
    return () => window.removeEventListener("hashchange", closeMenu)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    // Move focus into the drawer so keyboard users can tab its items.
    const firstItem = menuRef.current?.querySelector<HTMLElement>("a, button")
    const previous = document.activeElement as HTMLElement | null
    firstItem?.focus()
    return () => previous?.focus()
  }, [menuOpen])

  const handleNavigate = (r: Route) => {
    setMenuOpen(false)
    onNavigate(r)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="ambient" aria-hidden="true" />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => handleNavigate("/overview")}
            className="group flex items-center gap-2.5 rounded-xl p-1 transition-opacity hover:opacity-90"
            aria-label="Go to overview"
          >
            <span className="relative grid h-8 w-8 place-items-center rounded-[11px] bg-gradient-to-b from-primary/85 to-primary/60 text-primary-fg shadow-[0_0_0_1px_rgba(126,160,255,0.25),0_6px_18px_-6px_var(--primary)]">
              <AudioWave className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              Voice Check
            </span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-glass hover:backdrop-blur-lg hover:text-ink"
              aria-label={
                theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
              }
            >
              {theme === "dark" ? (
                <Sun className="h-[17px] w-[17px]" />
              ) : (
                <Moon className="h-[17px] w-[17px]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-glass hover:backdrop-blur-lg hover:text-ink"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              {menuOpen ? (
                <X className="h-[17px] w-[17px]" />
              ) : (
                <Menu className="h-[17px] w-[17px]" />
              )}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-ink/10 dark:bg-black/40"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.nav
              key="drawer"
              ref={menuRef}
              role="menu"
              aria-label="Main navigation"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="glass fixed right-4 top-16 z-50 w-64 rounded-2xl p-2"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const active = route === item.route
                return (
                  <button
                    key={item.route}
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate(item.route)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-primary/12 font-medium text-primary"
                        : "text-muted hover:bg-ink/5 hover:text-ink",
                    )}
                  >
                    <Icon
                      className={cn("h-[18px] w-[18px]", !active && "opacity-80")}
                    />
                    {item.label}
                  </button>
                )
              })}
              <div className="mt-2 border-t border-glass-border pt-2.5 pb-1 px-3">
                <p className="text-[11px] leading-relaxed text-subtle">
                  SIH 2026 — demo prototype
                </p>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={route}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 text-xs text-subtle sm:px-6">
          <span>Voice Check</span>
          <span>SIH 2026</span>
        </div>
      </footer>
    </div>
  )
}

export function AudioWave({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 12h1.6M7 9v6M10 6v12M13 8v8M16 10.5v3M18.4 12h1.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}