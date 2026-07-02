import { useState, useEffect } from 'react'

export function useElapsedTime(startTime) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTime) {
      setElapsed(0)
      return
    }

    const updateElapsed = () => {
      const start = new Date(startTime).getTime()
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - start) / 1000)
      setElapsed(elapsedSeconds)
    }

    // Update immediately
    updateElapsed()

    // Update every second
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  return elapsed
}
