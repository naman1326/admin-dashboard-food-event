import { useState, useEffect } from 'react'
import { fetchAdminActions, clearAdminActions } from '../supabaseClient.js'

export default function LogsView() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('all') // 'all', 'confirm', 'undo'

  async function loadLogs() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminActions()
      setLogs(data || [])
    } catch (err) {
      console.error('Failed to load logs:', err)
      setError('Could not load logs from the database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  async function handleClearLogs() {
    if (!window.confirm('Are you absolutely sure you want to clear all override logs? This cannot be undone.')) {
      return
    }
    setLoading(true)
    try {
      await clearAdminActions()
      setLogs([])
    } catch (err) {
      console.error('Failed to clear logs:', err)
      setError('Could not clear logs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    const participantName = log.participants?.name || ''
    const participantReg = log.participants?.reg_no || ''
    const checkpointLabel = log.checkpoints?.label || ''
    const checkpointCode = log.checkpoints?.code || ''
    const note = log.note || ''

    const matchesSearch =
      participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participantReg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      checkpointLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      checkpointCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesAction = actionFilter === 'all' || log.action === actionFilter

    return matchesSearch && matchesAction
  })

  function formatLogTime(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="logs-view-container">
      <header className="logs-header">
        <div className="logs-brand-container">
          <img src="/logo.png" alt="Swarajya Logo" className="logs-logo" />
          <div className="logs-brand-text">
            <h1 className="logs-title">स्वराज्य</h1>
            <p className="logs-subtitle">Manual Override History</p>
          </div>
        </div>

        <div className="logs-header-actions">
          <button
            type="button"
            className="logs-action-btn refresh-btn"
            onClick={loadLogs}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="logs-action-btn clear-btn"
            onClick={handleClearLogs}
            disabled={loading || logs.length === 0}
          >
            Clear Logs
          </button>
          <button
            type="button"
            className="logs-action-btn close-btn"
            onClick={() => window.close()}
          >
            Close Window
          </button>
        </div>
      </header>

      <div className="logs-toolbar">
        <div className="logs-search-wrapper">
          <input
            type="text"
            className="logs-search-input"
            placeholder="Search by participant name, reg no, or checkpoint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="logs-clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="logs-filter-wrapper">
          <label htmlFor="action-filter" className="logs-filter-label">Filter Action:</label>
          <select
            id="action-filter"
            className="logs-select-filter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">All Actions</option>
            <option value="confirm">Manual Confirmations</option>
            <option value="undo">Manual Undos</option>
          </select>
        </div>
      </div>

      {error && <div className="logs-error-message">{error}</div>}

      <div className="logs-table-card">
        {loading && logs.length === 0 ? (
          <div className="logs-loading-state">
            <span className="logs-spinner"></span>
            <p>Loading audit logs…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="logs-empty-state">
            <p className="logs-empty-title">No matching logs found</p>
            <p className="logs-empty-subtitle">
              {logs.length === 0
                ? 'No manual overrides have been performed yet.'
                : 'Try adjusting your search query or action filter.'}
            </p>
          </div>
        ) : (
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Participant</th>
                  <th>Checkpoint</th>
                  <th>Action</th>
                  <th>Reason / Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isUndo = log.action === 'undo'
                  return (
                    <tr key={log.id} className="logs-table-row">
                      <td className="logs-cell-time">{formatLogTime(log.created_at)}</td>
                      <td className="logs-cell-participant">
                        <div className="participant-name">{log.participants?.name || 'Unknown'}</div>
                        <div className="participant-reg">{log.participants?.reg_no || 'N/A'}</div>
                      </td>
                      <td className="logs-cell-checkpoint">
                        <div className="checkpoint-label">{log.checkpoints?.label || 'N/A'}</div>
                        <div className="checkpoint-code">{log.checkpoints?.code || ''}</div>
                      </td>
                      <td className="logs-cell-action">
                        <span className={`logs-badge ${isUndo ? 'badge-undo' : 'badge-confirm'}`}>
                          {isUndo ? 'Undo' : 'Confirm'}
                        </span>
                      </td>
                      <td className="logs-cell-note">
                        <div className={`logs-note-bubble ${isUndo ? 'is-undo' : ''}`}>
                          {log.note || <span className="logs-no-note">No reason provided</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="logs-footer">
        Showing {filteredLogs.length} of {logs.length} logged overrides
      </div>
    </div>
  )
}
