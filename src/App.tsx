import { useState } from 'react'
import { BottomNav } from './components/shared'
import HomeScreen from './screens/Home'
import WorkoutScreen from './screens/Workout'
import NutritionScreen from './screens/Nutrition'
import ProgressScreen from './screens/Progress'
import ProfileScreen from './screens/Profile'

type Tab = 'home' | 'workout' | 'nutrition' | 'progress' | 'profile'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')

  const screens: Record<Tab, React.ReactNode> = {
    home: <HomeScreen />,
    workout: <WorkoutScreen />,
    nutrition: <NutritionScreen />,
    progress: <ProgressScreen />,
    profile: <ProfileScreen />,
  }

  return (
    <div style={{ background: '#0B1220', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 430, position: 'relative' }}>
        {/* Screen */}
        <div key={tab} style={{ animation: 'fadeUp 0.3s ease both' }}>
          {screens[tab]}
        </div>

        {/* Bottom Nav */}
        <BottomNav active={tab} onChange={setTab} />
      </div>
    </div>
  )
}
