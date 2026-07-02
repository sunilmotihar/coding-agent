import { useState } from 'react'
import axios from 'axios'
import { useAgentStore } from '../store/agentStore'

const PHASE_LABELS = {
  IDLE: 'Starting…',
  PROVISIONING_WORKSPACE: 'Provisioning workspace…',
  CLONING: 'Cloning repo…',
  ANALYZING: 'Analyzing codebase…',
  AWAITING_PLAN_APPROVAL: 'Plan ready — review needed',
  EXECUTING: 'Writing code…',
  PUSHING: 'Pushing branch…',
  AWAITING_PR_APPROVAL: 'Diff ready — review needed',
  CREATING_PR: 'Opening PR…',
}

export function KanbanCard({ card }) {
  const [loading, setLoading] = useState(false)
  const [editingRepo, setEditingRepo] = useState(false)
  const [repoInput, setRepoInput] = useState(card.repoUrl)
  const startCard = useAgentStore((s) => s.startCard)
  const updateCardRepo = useAgentStore((s) => s.updateCardRepo)
  const deleteCard = useAgentStore((s) => s.deleteCard)
  const activeCardId = useAgentStore((s) => s.activeCardId)
  const phase = useAgentStore((s) => s.phase)

  const isActive = card.id === activeCardId
  const livePhase = isActive ? phase : null
  const repoName = card.repoUrl.replace('https://github.com/', '')

  const handleStart = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post('http://localhost:8000/api/sessions', {
        task: card.title,
        repo_url: card.repoUrl,
        autonomous: false,
      })
      startCard(card.id, data.session_id)
    } catch (err) {
      alert('Failed to start: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRepoSave = () => {
    if (repoInput.trim()) updateCardRepo(card.id, repoInput.trim())
    setEditingRepo(false)
  }

  return (
    <div className={`kanban-card${isActive ? ' kanban-card--active' : ''}`}>
      <div className="kanban-card__header">
        <div className="kanban-card__title">{card.title}</div>
        <button
          className="kanban-card__delete"
          onClick={() => deleteCard(card.id)}
          title="Delete card"
        >
          ×
        </button>
      </div>
      <div className="kanban-card__desc">{card.description}</div>

      {card.column === 'backlog' && editingRepo ? (
        <div className="kanban-card__repo-edit">
          <input
            className="add-card-form__input"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRepoSave(); if (e.key === 'Escape') setEditingRepo(false) }}
            autoFocus
          />
          <div className="add-card-form__actions">
            <button className="btn btn--primary btn--sm" onClick={handleRepoSave}>Save</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setEditingRepo(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div
          className={`kanban-card__repo${card.column === 'backlog' ? ' kanban-card__repo--editable' : ''}`}
          onClick={() => card.column === 'backlog' && setEditingRepo(true)}
          title={card.column === 'backlog' ? 'Click to change repo' : undefined}
        >
          {repoName}
          {card.column === 'backlog' && <span className="kanban-card__repo-edit-hint"> ✎</span>}
        </div>
      )}

      {card.column === 'backlog' && !editingRepo && (
        <button
          className="btn btn--primary btn--sm"
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? 'Starting…' : '▶ Start'}
        </button>
      )}

      {card.column === 'working' && (
        <div className="phase-badge">
          <span className="dot" />
          {(isActive && PHASE_LABELS[livePhase]) || 'Agent working…'}
        </div>
      )}

      {card.column === 'review' && (
        <div className="phase-badge phase-badge--review">
          👀 Awaiting your review
        </div>
      )}

      {card.column === 'done' && card.prUrl && (
        <a
          href={card.prUrl}
          target="_blank"
          rel="noreferrer"
          className="pr-card-link"
        >
          View PR →
        </a>
      )}
    </div>
  )
}
