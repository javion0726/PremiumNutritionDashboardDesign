import { createContext, useContext, useEffect, useState } from 'react'
import { BottomNav } from './components/shared'
import HomeScreen from './screens/Home'
import WorkoutScreen from './screens/Workout'
import NutritionScreen from './screens/Nutrition'
import ProgressScreen from './screens/Progress'
import ProfileScreen from './screens/Profile'
import Onboarding from './screens/Onboarding'
import { runMigrations, getConfig, isOnboarded } from './lib/store'

export type Tab = 'home' | 'workout' | 'nutrition' | 'progress' | 'profile'

// Screens can navigate (e.g. Home's "Start Workout" → workout tab).
const NavContext = createContext<(t: Tab) => void>(() => {})
export function useNav() { return useContext(NavContext) }

// Old-schema data (from the previous Ascend deploy) is migrated before first render.
runMigrations()

// Show onboarding only for genuinely new users — same rule as the original app
// (no name saved yet, and the flow hasn't already been completed). Anyone whose
// data migrated in from the old deploy already has a name, so they skip straight in.
function needsOnboarding(): boolean {
  return !getConfig().name?.trim() && !isOnboarded()
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [onboarding, setOnboarding] = useState(needsOnboarding)

  // Scroll to top on tab change — matches the prototype's fresh-screen feel.
  useEffect(() => { window.scrollTo(0, 0) }, [tab])

  const screens: Record<Tab, React.ReactNode> = {
    home: <HomeScreen />,
    workout: <WorkoutScreen />,
    nutrition: <NutritionScreen />,
    progress: <ProgressScreen />,
    profile: <ProfileScreen />,
  }

  if (onboarding) {
    return <Onboarding onDone={() => setOnboarding(false)} />
  }

  return (
    <NavContext.Provider value={setTab}>
      <div style={{ background: '#0B1220', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 430, position: 'relative' }}>
          <div key={tab} style={{ animation: 'fadeUp 0.3s ease both' }}>
            {screens[tab]}
          </div>
          <BottomNav active={tab} onChange={setTab} />
        </div>
      </div>
    </NavContext.Provider>
  )
}
