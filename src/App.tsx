import { ThemeProvider } from "@/lib/theme"
import { StoreProvider } from "@/lib/store"
import { useRoute } from "@/lib/router"
import { AppShell } from "@/components/layout/AppShell"
import { OverviewPage } from "@/pages/Overview"
import { VoiceCheckPage } from "@/pages/VoiceCheck"
import { HistoryPage } from "@/pages/History"
import { AnalyticsPage } from "@/pages/Analytics"
import { VerificationPage } from "@/pages/Verification"
import { ActivityPage } from "@/pages/Activity"
import { SettingsPage } from "@/pages/Settings"

function AppContent() {
  const [route, navigate] = useRoute()

  return (
    <AppShell route={route} onNavigate={navigate}>
      {route === "/overview" && <OverviewPage onNavigate={navigate} />}
      {route === "/voice-check" && <VoiceCheckPage />}
      {route === "/history" && <HistoryPage onNavigate={navigate} />}
      {route === "/analytics" && <AnalyticsPage onNavigate={navigate} />}
      {route === "/verification" && <VerificationPage />}
      {route === "/activity" && <ActivityPage />}
      {route === "/settings" && <SettingsPage />}
    </AppShell>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ThemeProvider>
  )
}