import { useEffect, useReducer } from 'react'
import { subscribe } from './store'

// Re-renders the calling component whenever any Ascend data is saved.
// Screens read from the store directly; this hook just provides reactivity.
export function useAppData(): number {
  const [tick, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => subscribe(bump), [])
  return tick
}
