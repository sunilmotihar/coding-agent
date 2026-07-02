import { useState } from 'react'
import { useAgentStore } from '../store/agentStore'

export function DiffViewer({ sendApproval }) {
  const diff = useAgentStore((s) => s.diff)
  const branch = useAgentStore((s) => s.branch)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  return (
    <div className="panel panel--diff">
      <h2>🔍 Review Changes</h2>
      <p className="panel__subtitle">
        Branch: <code>{branch}</code>
      </p>

      <pre className="diff-view">{diff || '(no changes detected)'}</pre>

      <div className="panel__actions">
        <button className="btn btn--primary" onClick={() => sendApproval('approve')}>
          ✓ Open PR
        </button>
        <button className="btn btn--danger" onClick={() => setRejecting(true)}>
          ✕ Cancel
        </button>
      </div>

      {rejecting && (
        <div className="reject-form">
          <textarea
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
          <button className="btn btn--danger" onClick={() => sendApproval('reject', { reason })}>
            Confirm Cancel
          </button>
        </div>
      )}
    </div>
  )
}
