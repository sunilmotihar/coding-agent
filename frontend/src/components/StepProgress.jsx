import { useMemo } from 'react'
import { useAgentStore } from '../store/agentStore'

export function StepProgress() {
  const currentStep = useAgentStore((s) => s.currentStep)
  const totalSteps = useAgentStore((s) => s.totalSteps)
  const currentStepTitle = useAgentStore((s) => s.currentStepTitle)
  const statusFeed = useAgentStore((s) => s.statusFeed)
  const toolCalls = useMemo(
    () => statusFeed.filter((e) => e.type === 'tool_call'),
    [statusFeed]
  )

  const stepNumber = (currentStep ?? 0) + 1
  const progress = totalSteps ? (stepNumber / totalSteps) * 100 : 0

  return (
    <div className="panel panel--progress">
      <h2>⚙️ Executing Plan</h2>

      {totalSteps != null && (
        <div className="step-counter">
          <span className="step-counter__label">
            Step {stepNumber} of {totalSteps}
          </span>
          <div className="step-bar">
            <div
              className="step-bar__fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {currentStepTitle && (
        <p className="step-title">{currentStepTitle}</p>
      )}

      <div className="tool-log">
        <div className="tool-log__header">Live tool calls</div>
        {toolCalls.length === 0 ? (
          <p className="tool-log__empty">Waiting for tool calls…</p>
        ) : (
          toolCalls.slice(-10).map((e) => (
            <div key={e.id} className="tool-log__entry">
              <code className="tool-log__name">{e.payload.tool}</code>
              <span className="tool-log__detail">
                {e.payload.input?.path ||
                  e.payload.input?.command ||
                  e.payload.input?.message ||
                  ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
