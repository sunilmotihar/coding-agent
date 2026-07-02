import { useAgentStore } from './store/agentStore'
import { useAgentSocket } from './hooks/useAgentSocket'
import { KanbanBoard } from './components/KanbanBoard'
import { StatusFeed } from './components/StatusFeed'
import { PlanApproval } from './components/PlanApproval'
import { StepProgress } from './components/StepProgress'
import { DiffViewer } from './components/DiffViewer'
import './App.css'

export default function App() {
  const sessionId = useAgentStore((s) => s.sessionId)
  const phase = useAgentStore((s) => s.phase)
  const error = useAgentStore((s) => s.error)
  const { sendApproval } = useAgentSocket(sessionId)

  const renderAction = () => {
    if (phase === 'AWAITING_PLAN_APPROVAL') return <PlanApproval sendApproval={sendApproval} />
    if (phase === 'EXECUTING') return <StepProgress />
    if (phase === 'AWAITING_PR_APPROVAL') return <DiffViewer sendApproval={sendApproval} />
    if (phase === 'ERROR') return (
      <div className="panel panel--error">
        <h2>❌ Error</h2>
        <pre className="error-msg">{error}</pre>
      </div>
    )
    return null
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="logo">⚡ Coding Agent</div>
        <p className="subtitle">Start a card — the agent plans, codes, and opens a PR.</p>
      </header>
      <div className="app__body">
        <div className="app__board">
          <KanbanBoard />
        </div>
        <div className="app__activity">
          {renderAction()}
          <StatusFeed />
        </div>
      </div>
    </div>
  )
}
