/** Declares the app routes and their page components. */
import { Navigate, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Games from '@/pages/Games'
import Garden from '@/pages/Garden'
import Profile from '@/pages/Profile'
import Memories from '@/pages/Memories'
import ActivityRoute from '@/pages/Activity'
import CognitiveAssessment from '@/pages/CognitiveAssessment'

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
