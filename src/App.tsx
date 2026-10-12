import { Navigate, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Games from '@/pages/Games'
import Garden from '@/pages/Garden'
import Profile from '@/pages/Profile'
import Memories from '@/pages/Memories'
import ActivityRoute from '@/pages/Activity'
import CognitiveAssessment from '@/pages/CognitiveAssessment'

// The app now has 3 main places: Memories (upload/view), Games (play), and the Memory Aquarium
// (view). "/" and "/profile" are kept as routes (not deleted) so nothing that still links to
// them breaks, but they redirect into the simplified 3-item app instead of showing their own
// dashboards. Profile/CognitiveAssessment content can be folded back in deliberately later.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/memories" replace />} />
        <Route path="/games" element={<Games />} />
        <Route path="/games/:game" element={<ActivityRoute />} />
        <Route path="/memories" element={<Memories />} />
        <Route path="/garden" element={<Garden />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/assessment" element={<CognitiveAssessment />} />
        <Route path="*" element={<Navigate to="/memories" replace />} />
      </Route>
    </Routes>
  )
}
