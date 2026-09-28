import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Games from '@/pages/Games'
import Garden from '@/pages/Garden'
import Profile from '@/pages/Profile'
import Placeholder from '@/pages/Placeholder'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/games" element={<Games />} />
        <Route path="/games/:game" element={<Placeholder part={2} note="Personalised games built from your own photos and stories." />} />
        <Route path="/memories" element={<Placeholder title="Your Memories" part={2} note="Caregivers will add photos, names and stories here." />} />
        <Route path="/garden" element={<Garden />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
