import { useAgentStore } from '../store/agentStore'

export function PRLink({ onReset }) {
  const prUrl = useAgentStore((s) => s.prUrl)

  return (
    <div className="panel panel--done">
      <div className="done-icon">🎉</div>
      <h2>PR Created!</h2>
      <a href={prUrl} target="_blank" rel="noreferrer" className="pr-link">
        {prUrl}
      </a>
      <button className="btn btn--secondary" onClick={onReset}>
        Run another task
      </button>
    </div>
  )
}
