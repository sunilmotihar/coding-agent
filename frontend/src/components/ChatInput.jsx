import { useState } from 'react'
import axios from 'axios'
import { useAgentStore } from '../store/agentStore'

export function ChatInput() {
  const [task, setTask] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [autonomous, setAutonomous] = useState(false)
  const [loading, setLoading] = useState(false)
  const setSession = useAgentStore((s) => s.setSession)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!task.trim() || !repoUrl.trim()) return
    setLoading(true)
    try {
      const { data } = await axios.post('http://localhost:8000/api/sessions', {
        task,
        repo_url: repoUrl,
        autonomous,
      })
      setSession(data.session_id)
    } catch (err) {
      alert('Failed to start session: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-input">
      <div className="chat-input__header">
        <div className="logo">⚡ Coding Agent</div>
        <p className="subtitle">Describe a task and point me at a GitHub repo — I'll plan, code, and open a PR.</p>
      </div>

      <form onSubmit={handleSubmit} className="chat-input__form">
        <div className="field">
          <label>GitHub Repo URL</label>
          <input
            type="url"
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>Task</label>
          <textarea
            placeholder="e.g. Add a /healthz endpoint that returns {status: ok}"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={3}
            required
          />
        </div>

        <div className="field field--row">
          <label className="toggle">
            <input
              type="checkbox"
              checked={autonomous}
              onChange={(e) => setAutonomous(e.target.checked)}
            />
            <span>Autonomous mode (skip approvals)</span>
          </label>
        </div>

        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Starting…' : '▶ Run Agent'}
        </button>
      </form>
    </div>
  )
}
