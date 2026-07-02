import { useAgentStore } from '../store/agentStore'

const PHASE_LABELS = {
  IDLE: '💤 Idle',
  PROVISIONING_WORKSPACE: '🔧 Provisioning workspace…',
  CLONING: '📥 Cloning repo…',
  ANALYZING: '🔍 Analyzing codebase…',
  AWAITING_PLAN_APPROVAL: '⏸ Waiting for plan approval',
  EXECUTING: '⚙️ Executing steps…',
  PUSHING: '🚀 Pushing branch…',
  AWAITING_PR_APPROVAL: '⏸ Waiting for PR approval',
  CREATING_PR: '🔀 Creating PR…',
  DONE: '✅ Done',
  ERROR: '❌ Error',
}

function FeedEntry({ entry }) {
  const { type, payload } = entry
  const time = new Date(entry.ts).toLocaleTimeString()

  if (type === 'phase_change') {
    return (
      <div className="feed-entry feed-entry--phase">
        <span className="feed-entry__time">{time}</span>
        <span className="feed-entry__label">{PHASE_LABELS[payload.phase] || payload.phase}</span>
        {payload.step_title && (
          <span className="feed-entry__detail"> — {payload.step_title}</span>
        )}
      </div>
    )
  }

  if (type === 'tool_call') {
    return (
      <div className="feed-entry feed-entry--tool">
        <span className="feed-entry__time">{time}</span>
        <code className="feed-entry__tool-name">{payload.tool}</code>
        <span className="feed-entry__detail">
          {payload.input?.path || payload.input?.command || payload.input?.message || ''}
        </span>
      </div>
    )
  }

  if (type === 'step_done') {
    return (
      <div className="feed-entry feed-entry--done">
        <span className="feed-entry__time">{time}</span>
        <span>✓ Step {payload.step} complete</span>
      </div>
    )
  }

  if (type === 'log') {
    return (
      <div className="feed-entry feed-entry--log">
        <span className="feed-entry__time">{time}</span>
        <span>{payload.message}</span>
      </div>
    )
  }

  if (type === 'context_ready') {
    return (
      <div className="feed-entry feed-entry--log">
        <span className="feed-entry__time">{time}</span>
        <span>📋 Context built ({payload.summary?.length} chars)</span>
      </div>
    )
  }

  if (type === 'plan_generated') {
    return (
      <div className="feed-entry feed-entry--log">
        <span className="feed-entry__time">{time}</span>
        <span>📝 Plan generated — {payload.steps?.length} steps</span>
      </div>
    )
  }

  return null
}

export function StatusFeed() {
  const statusFeed = useAgentStore((s) => s.statusFeed)

  if (statusFeed.length === 0) return null

  return (
    <div className="status-feed">
      <h3>Activity</h3>
      <div className="status-feed__entries">
        {statusFeed.map((entry) => (
          <FeedEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
