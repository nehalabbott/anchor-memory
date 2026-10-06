import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import AssistantBar from './AssistantBar'
import AssistantPanel from './AssistantPanel'
import VoicePrivacyControl from './VoicePrivacyControl'
import VoiceAwarenessController from '@/assistant/VoiceAwarenessController'
import { useApp } from '@/store/useApp'
import { useInactivityNudge } from '@/assistant/useInactivityNudge'
import { initializeAppData } from '@/lib/appBootstrap'
import { ScreenContextSync, useScreenContextTicker } from '@/store/useScreenContext'

/**
 * App shell: scrollable content  ->  persistent Assistant toolbar  ->  bottom nav.
 * Centered phone-width column on desktop so the Lab 5 wireframes are reproduced faithfully.
 */
export default function Layout() {
  const largeText = useApp((s) => s.largeText)
  const preferences = useApp((s) => s.preferences)
  const dataSyncStatus = useApp((s) => s.dataSyncStatus)
  const dataSyncMessage = useApp((s) => s.dataSyncMessage)
  useInactivityNudge()
  useScreenContextTicker()
  useEffect(() => {
    document.body.dataset.theme = preferences.theme
  }, [preferences.theme])
  useEffect(() => {
    void initializeAppData()
    const retryWhenOnline = () => { void initializeAppData({ retry: true, hadLocalData: true }) }
    window.addEventListener('online', retryWhenOnline)
    const retryTimer = window.setInterval(() => {
      const status = useApp.getState().dataSyncStatus
      if (navigator.onLine && (status === 'offline' || status === 'error')) {
        void initializeAppData({ retry: true, hadLocalData: true })
      }
    }, 30_000)
    return () => {
      window.removeEventListener('online', retryWhenOnline)
      window.clearInterval(retryTimer)
    }
  }, [])
  return (
    <div className="h-full flex justify-center bg-garden-900/10">
      <div className={`relative h-full w-full max-w-[480px] flex flex-col bg-mist shadow-soft ${largeText ? 'text-[1.25rem]' : ''}`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3 focus:rounded-xl">Skip to content</a>
        <ScreenContextSync />
        <main id="main" className="flex-1 overflow-y-auto px-5 pt-6 pb-4">
          <Outlet />
        </main>
        <VoiceAwarenessController />
        {(dataSyncStatus === 'offline' || dataSyncStatus === 'error') && (
          <p className="px-4 py-1 text-center text-xs text-ink/65" aria-live="polite">{dataSyncMessage}</p>
        )}
        <VoicePrivacyControl />
        <AssistantBar />
        <BottomNav />
        <AssistantPanel />
      </div>
    </div>
  )
}
