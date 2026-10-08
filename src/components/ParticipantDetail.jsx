import { useState } from 'react'
import { adminConfirm, adminUndo } from '../supabaseClient.js'
import { formatScanTime } from '../dashboardLogic.js'

export default function ParticipantDetail({ participant, onClose, onSync }) {
  const [busyCode, setBusyCode] = useState(null)
  const [noteDrafts, setNoteDrafts] = useState({})
  const [feedback, setFeedback] = useState(null) // { code, message, isError }

  async function handleConfirm(checkpointCode) {
    setBusyCode(checkpointCode)
    const result = await adminConfirm(participant.token, checkpointCode, 'Marked from admin dashboard')
    setBusyCode(null)
    if (result.status === 'confirmed') {
      setFeedback({ code: checkpointCode, message: 'Marked as done', isError: false })
      if (onSync) onSync()
    } else if (result.status === 'duplicate') {
      setFeedback({ code: checkpointCode, message: 'Already marked — no change made', isError: false })
    } else {
      setFeedback({ code: checkpointCode, message: 'Something went wrong — try again', isError: true })
    }
  }

  async function handleUndo(checkpointCode) {
    const note = (noteDrafts[checkpointCode] || '').trim()
    if (!note) {
      setFeedback({ code: checkpointCode, message: 'A reason is required to undo a scan', isError: true })
      return
    }
    setBusyCode(checkpointCode)
    const result = await adminUndo(participant.token, checkpointCode, note)
    setBusyCode(null)
    if (result.status === 'undone') {
      setFeedback({ code: checkpointCode, message: 'Undone', isError: false })
      setNoteDrafts((prev) => ({ ...prev, [checkpointCode]: '' }))
      if (onSync) onSync()
    } else if (result.status === 'nothing_to_undo') {
      setFeedback({ code: checkpointCode, message: 'Nothing to undo — it was never scanned', isError: false })
    } else {
      setFeedback({ code: checkpointCode, message: 'Something went wrong — try again', isError: true })
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div>
            <h2>{participant.name}</h2>
            <p className="detail-reg">{participant.reg_no}</p>
          </div>
          <button type="button" className="link-button" onClick={onClose}>
            Close
          </button>
        </div>

        <ul className="detail-checkpoint-list">
          {participant.checkpointStatus.map((cs) => {
            const isBusy = busyCode === cs.code
            const rowFeedback = feedback?.code === cs.code ? feedback : null

            return (
              <li key={cs.checkpointId} className="detail-checkpoint-row">
                <div className="detail-checkpoint-top">
                  <span className={`status-dot ${cs.scan ? 'is-done' : ''}`} />
                  <span className="detail-checkpoint-label">{cs.label}</span>
                  {cs.scan && (
                    <span className="detail-checkpoint-meta">
                      {formatScanTime(cs.scan.scanned_at)} · {cs.scan.method === 'manual' ? 'manual' : 'scanned'}
                    </span>
                  )}
                </div>

                {!cs.scan && (
                  <button
                    type="button"
                    className="detail-action-button"
                    disabled={isBusy}
                    onClick={() => handleConfirm(cs.code)}
                  >
                    {isBusy ? 'Confirming…' : 'Mark as done'}
                  </button>
                )}

                {cs.scan && (
                  <div className="detail-undo-row">
                    <input
                      type="text"
                      placeholder="Reason for undoing (required)"
                      value={noteDrafts[cs.code] || ''}
                      onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [cs.code]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="detail-action-button is-undo"
                      disabled={isBusy}
                      onClick={() => handleUndo(cs.code)}
                    >
                      {isBusy ? 'Undoing…' : 'Undo'}
                    </button>
                  </div>
                )}

                {rowFeedback && (
                  <p className={`detail-feedback ${rowFeedback.isError ? 'is-error' : ''}`}>{rowFeedback.message}</p>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
