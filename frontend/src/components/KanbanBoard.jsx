import { useState } from 'react'
import { useAgentStore } from '../store/agentStore'
import { KanbanCard } from './KanbanCard'

const COLUMNS = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'working', label: '⚡ Agent Working' },
  { id: 'review', label: '👀 Awaiting Review' },
  { id: 'done', label: '✅ Done' },
]

function AddCardForm({ onClose }) {
  const addCard = useAgentStore((s) => s.addCard)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [repoUrl, setRepoUrl] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !repoUrl.trim()) return
    addCard(title.trim(), description.trim(), repoUrl.trim())
    onClose()
  }

  return (
    <form className="add-card-form" onSubmit={handleSubmit}>
      <input
        className="add-card-form__input"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        required
      />
      <textarea
        className="add-card-form__textarea"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
      <input
        className="add-card-form__input"
        placeholder="https://github.com/owner/repo"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        required
      />
      <div className="add-card-form__actions">
        <button type="submit" className="btn btn--primary btn--sm">Add card</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}

export function KanbanBoard() {
  const cards = useAgentStore((s) => s.cards)
  const [showAddForm, setShowAddForm] = useState(false)

  return (
    <div className="kanban-board">
      {COLUMNS.map((col) => {
        const colCards = cards.filter((c) => c.column === col.id)
        return (
          <div key={col.id} className="kanban-column">
            <div className="kanban-column__header">
              <span>{col.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {colCards.length > 0 && (
                  <span className="kanban-column__count">{colCards.length}</span>
                )}
                {col.id === 'backlog' && (
                  <button
                    className="btn btn--ghost btn--sm kanban-column__add"
                    onClick={() => setShowAddForm(true)}
                    title="Add card"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
            <div className="kanban-column__cards">
              {colCards.map((card) => (
                <KanbanCard key={card.id} card={card} />
              ))}
              {colCards.length === 0 && !showAddForm && (
                <div className="kanban-column__empty">Empty</div>
              )}
              {col.id === 'backlog' && showAddForm && (
                <AddCardForm onClose={() => setShowAddForm(false)} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
