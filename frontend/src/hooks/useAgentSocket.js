import { useEffect, useRef, useCallback } from 'react'
import { useAgentStore } from '../store/agentStore'

export function useAgentSocket(sessionId) {
  const ws = useRef(null)
  const dispatch = useAgentStore((s) => s.dispatch)

  useEffect(() => {
    if (!sessionId) return

    const socket = new WebSocket(`ws://localhost:8000/ws/${sessionId}`)
    ws.current = socket

    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      // Special case: DONE phase carries pr_url in the payload
      if (msg.type === 'phase_change' && msg.payload.phase === 'DONE') {
        dispatch({ type: 'phase_change', payload: msg.payload })
        dispatch({ type: 'phase_change_done', payload: msg.payload })
      } else {
        dispatch(msg)
      }
    }

    socket.onclose = () => dispatch({ type: 'ws_closed', payload: {} })
    socket.onerror = () => dispatch({ type: 'error', payload: { message: 'WebSocket error' } })

    return () => socket.close()
  }, [sessionId])

  const sendApproval = useCallback((action, extra = {}) => {
    ws.current?.send(JSON.stringify({
      type: 'user_approval',
      payload: { action, ...extra },
    }))
  }, [])

  return { sendApproval }
}
