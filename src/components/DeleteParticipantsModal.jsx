import { useState, useRef, useEffect } from 'react'
import { adminDeleteAllParticipants } from '../supabaseClient.js'

export default function DeleteParticipantsModal({ isOpen, onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [showSqlHelp, setShowSqlHelp] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setConfirmText('')
      setError(null)
      setShowSqlHelp(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  const isDeleteValid = confirmText.trim() === 'DELETE'

  const sqlCode = `-- Run this in your Supabase SQL Editor once:
create or replace function admin_delete_all_participants(
  p_admin_password text
) returns jsonb
language plpgsql
security definer
as $$
begin
  if p_admin_password is null or p_admin_password <> 'mgo2XHBobu8Y94t9' then
    raise exception 'unauthorized';
  end if;

  delete from scans where id is not null;
  begin
    delete from admin_actions where id is not null;
  exception when undefined_table then
    null;
  end;
  delete from participants where id is not null;

  return jsonb_build_object('status', 'ok');
end;
$$;

grant execute on function admin_delete_all_participants(text) to anon;`

  async function handleDelete() {
    if (!isDeleteValid || isDeleting) return
    setIsDeleting(true)
    setError(null)
    setShowSqlHelp(false)

    try {
      await adminDeleteAllParticipants()
      setIsDeleting(false)
      onDeleted()
      onClose()
    } catch (err) {
      console.error('Delete error:', err)
      setIsDeleting(false)
      setError(err.message || 'Failed to delete participants.')
      if (err.isRpcMissing) {
        setShowSqlHelp(true)
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isDeleteValid && !isDeleting) {
        handleDelete()
      }
    }
  }

  function handleCopySql() {
    navigator.clipboard.writeText(sqlCode)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2000)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container danger-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div className="modal-header">
          <div className="modal-header-icon danger-icon">⚠️</div>
          <div>
            <h2 id="delete-modal-title" className="modal-title">Delete All Participants</h2>
            <p className="modal-subtitle">Permanent action — cannot be undone</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="danger-callout">
            <p>
              This will permanently delete <strong>ALL</strong> participants, their scan records, and admin logs from
              the database. The entire dashboard will be cleared.
            </p>
          </div>

          <div className="confirm-input-section">
            <label htmlFor="delete-confirm-input" className="confirm-label">
              To proceed, please type <strong className="danger-text">DELETE</strong> in all caps below and press{' '}
              <kbd>Enter</kbd>:
            </label>
            <input
              id="delete-confirm-input"
              ref={inputRef}
              type="text"
              className="confirm-text-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="DELETE"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              disabled={isDeleting}
            />
            <span className="confirm-hint">(Auto-capitalization is disabled — enter exactly DELETE)</span>
          </div>

          {error && (
            <div className="modal-error-box">
              <span className="error-icon">✗</span> {error}
            </div>
          )}

          {showSqlHelp && (
            <div className="sql-help-card">
              <div className="sql-help-header">
                <span>Supabase SQL Setup Required</span>
                <button type="button" className="sql-copy-btn" onClick={handleCopySql}>
                  {copiedSql ? '✓ Copied!' : 'Copy SQL'}
                </button>
              </div>
              <pre className="sql-code-snippet">{sqlCode}</pre>
              <p className="sql-help-note">
                Paste this once into your Supabase Dashboard → <strong>SQL Editor</strong> and click Run.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="modal-btn secondary-btn" onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button
            type="button"
            className="modal-btn danger-action-btn"
            onClick={handleDelete}
            disabled={!isDeleteValid || isDeleting}
          >
            {isDeleting ? 'Deleting All Data…' : 'Delete All Participants'}
          </button>
        </div>
      </div>
    </div>
  )
}
