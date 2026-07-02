import { useState } from 'react'
import { useAgentStore } from '../store/agentStore'

export function PlanApproval({ sendApproval }) {
  const plan = useAgentStore((s) => s.plan)
  const [steps, setSteps] = useState(plan)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  const handleApprove = () => {
    // Send back full step objects (tool + args preserved, title/description may be edited)
    sendApproval('approve', { steps })
  }

  const handleReject = () => {
    sendApproval('reject', { reason })
    setRejecting(false)
  }

  const updateDescription = (index, value) => {
    setSteps((prev) =>
      prev.map((s) => (s.index === index ? { ...s, description: value } : s))
    )
  }

  return (
    <div className="panel panel--approval">
      <h2>📝 Review the Plan</h2>
      <p className="panel__subtitle">Edit descriptions if needed, then approve or reject.</p>

      <div className="plan-steps">
        {steps.map((step) => (
          <div key={step.index} className="plan-step">
            <div className="plan-step__header">
              <span className="plan-step__index">{step.index + 1}</span>
              <strong>{step.title}</strong>
            </div>
            <textarea
              className="plan-step__desc"
              value={step.description}
              rows={2}
              onChange={(e) => updateDescription(step.index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="panel__actions">
        <button className="btn btn--primary" onClick={handleApprove}>
          ✓ Approve Plan
        </button>
        <button className="btn btn--danger" onClick={() => setRejecting(true)}>
          ✕ Reject
        </button>
      </div>

      {rejecting && (
        <div className="reject-form">
          <textarea
            placeholder="Reason for rejection (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
          <button className="btn btn--danger" onClick={handleReject}>
            Confirm Reject
          </button>
        </div>
      )}
    </div>
  )
}
