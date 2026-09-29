import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Games from '@/pages/Games'
import Garden from '@/pages/Garden'
import Profile from '@/pages/Profile'
import Memories from '@/pages/Memories'
import Activity from '@/pages/Activity'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/games" element={<Games />} />
        <Route path="/games/:game" element={<Activity />} />
        <Route path="/memories" element={<Memories />} />
        <Route path="/garden" element={<Garden />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
