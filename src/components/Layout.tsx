import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import AssistantBar from './AssistantBar'
import AssistantPanel from './AssistantPanel'
import { useApp } from '@/store/useApp'

/**
 * App shell: scrollable content  ->  persistent Assistant toolbar  ->  bottom nav.
 * Centered phone-width column on desktop so the Lab 5 wireframes are reproduced faithfully.
 */
export default function Layout() {
  const largeText = useApp((s) => s.largeText)
  return (
    <div className="h-full flex justify-center bg-garden-900/10">
      <div className={`relative h-full w-full max-w-[480px] flex flex-col bg-mist shadow-soft ${largeText ? 'text-[1.25rem]' : ''}`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3 focus:rounded-xl">Skip to content</a>
        <main id="main" className="flex-1 overflow-y-auto px-5 pt-6 pb-4">
          <Outlet />
        </main>
        <AssistantBar />
        <BottomNav />
        <AssistantPanel />
      </div>
    </div>
  )
}
