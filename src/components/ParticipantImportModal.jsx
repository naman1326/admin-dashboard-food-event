import { useState, useEffect, useRef, useCallback } from 'react'
import { adminAddParticipants, fetchAllParticipants } from '../supabaseClient.js'

export default function ParticipantImportModal({ isOpen, onClose, onSync }) {
  // Steps: 'upload' -> 'add_db' -> 'send_emails' -> 'progress'
  const [currentStep, setCurrentStep] = useState('upload')

  // CSV and batch data
  const [file, setFile] = useState(null)
  const [csvContent, setCsvContent] = useState('')
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [batchError, setBatchError] = useState(null)
  const [batchResult, setBatchResult] = useState(null) // { participants, emails, total, emailCount }

  // Step 2: DB adding
  const [isAddingToDb, setIsAddingToDb] = useState(false)
  const [dbError, setDbError] = useState(null)
  const [dbSuccess, setDbSuccess] = useState(false)
  const [showSqlHelp, setShowSqlHelp] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  // Step 3: Email inputs & token verification
  const [senderEmail, setSenderEmail] = useState('')
  const [senderPassword, setSenderPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isDryRun, setIsDryRun] = useState(false)
  const [templateInfo, setTemplateInfo] = useState({ subject: '', body: '' })
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [hasPoster, setHasPoster] = useState(false)
  const [isRefreshingTemplate, setIsRefreshingTemplate] = useState(false)
  const [syncVerification, setSyncVerification] = useState(null)
  const [isVerifyingSync, setIsVerifyingSync] = useState(false)
  const [isResyncing, setIsResyncing] = useState(false)
  const [resyncSuccess, setResyncSuccess] = useState(false)
  const [sentLogCount, setSentLogCount] = useState(0)
  const [forceResend, setForceResend] = useState(false)

  // Step 4: Email Progress
  const [emailProgress, setEmailProgress] = useState({ current: 0, total: 0, currentEmail: '', currentName: '' })
  const [emailLogs, setEmailLogs] = useState([])
  const [isSendingEmails, setIsSendingEmails] = useState(false)
  const [emailCompleted, setEmailCompleted] = useState(false)
  const [completionStats, setCompletionStats] = useState({ sent: 0, failed: 0 })

  const fileInputRef = useRef(null)
  const logScrollRef = useRef(null)

  const fetchStatusAndTemplate = useCallback(async () => {
    try {
      setIsRefreshingTemplate(true)
      const res = await fetch('/api/status')
      const data = await res.json()
      if (data.template) {
        setTemplateInfo(data.template)
      }
      if (typeof data.hasPoster === 'boolean') {
        setHasPoster(data.hasPoster)
      }
      if (typeof data.sentLogCount === 'number') {
        setSentLogCount(data.sentLogCount)
      }
    } catch {
      // fallback
      setTemplateInfo({
        subject: 'Khau Galli Pass For Food Festival',
        body: 'Namaskar {name}!\n\nYour Khau Galli food pass QR code is attached to this mail.\n\nCounter Number: 12\n\nRegards,\nSwarajya',
      })
    } finally {
      setIsRefreshingTemplate(false)
    }
  }, [])

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('upload')
      setFile(null)
      setCsvContent('')
      setIsProcessingBatch(false)
      setBatchError(null)
      setBatchResult(null)
      setIsAddingToDb(false)
      setDbError(null)
      setDbSuccess(false)
      setShowSqlHelp(false)
      setEmailProgress({ current: 0, total: 0, currentEmail: '', currentName: '' })
      setEmailLogs([])
      setIsSendingEmails(false)
      setEmailCompleted(false)
      setForceResend(false)

      fetchStatusAndTemplate()
    }
  }, [isOpen, fetchStatusAndTemplate])

  // Auto-scroll logs
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight
    }
  }, [emailLogs])

  // Auto-verify tokens and refresh template when reaching send_emails step
  useEffect(() => {
    if (isOpen && currentStep === 'send_emails') {
      verifyTokensWithDb()
      fetchStatusAndTemplate()
    }
  }, [isOpen, currentStep, fetchStatusAndTemplate])

  const sqlCode = `-- Run this in your Supabase SQL Editor once:
create or replace function admin_add_participants(
  p_admin_password text,
  p_participants jsonb
) returns jsonb
language plpgsql
security definer
as $$
declare
  item jsonb;
  v_count int := 0;
begin
  if p_admin_password is null or p_admin_password <> 'mgo2XHBobu8Y94t9' then
    raise exception 'unauthorized';
  end if;

  if jsonb_typeof(p_participants) <> 'array' then
    raise exception 'p_participants must be a JSON array';
  end if;

  for item in select * from jsonb_array_elements(p_participants)
  loop
    if item->>'reg_no' is not null and trim(item->>'reg_no') <> '' and exists (
      select 1 from participants where reg_no = trim(item->>'reg_no')
    ) then
      update participants
      set
        token = item->>'token',
        name = coalesce(nullif(trim(item->>'name'), ''), name),
        email = coalesce(nullif(trim(item->>'email'), ''), email)
      where reg_no = trim(item->>'reg_no');
    else
      insert into participants (token, name, reg_no, email)
      values (
        item->>'token',
        item->>'name',
        nullif(trim(item->>'reg_no'), ''),
        nullif(trim(item->>'email'), '')
      )
      on conflict (token) do update
      set
        name = excluded.name,
        reg_no = coalesce(excluded.reg_no, participants.reg_no),
        email = coalesce(excluded.email, participants.email);
    end if;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('status', 'ok', 'count', v_count);
end;
$$;

grant execute on function admin_add_participants(text, jsonb) to anon;`

  function handleFileSelected(e) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setBatchError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result || ''
      setCsvContent(text)
      processCsv(text)
    }
    reader.readAsText(selected)
  }

  function handleUseExistingCsv() {
    processCsv(null)
  }

  async function processCsv(text) {
    setIsProcessingBatch(true)
    setBatchError(null)

    try {
      // Gather existing tokens from Supabase so existing participants NEVER get random new tokens
      const tokensMapping = {}
      try {
        const existingParticipants = await fetchAllParticipants()
        if (Array.isArray(existingParticipants)) {
          existingParticipants.forEach((p) => {
            if (p.reg_no && p.token) {
              tokensMapping[p.reg_no.trim()] = p.token.trim()
            }
          })
        }
      } catch (e) {
        console.warn('Could not fetch existing participants for token mapping:', e)
      }

      const res = await fetch('/api/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(text ? { csvText: text } : { useExisting: true }),
          tokensMapping,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate batch')
      }

      setBatchResult(data)
      setIsProcessingBatch(false)
      setCurrentStep('add_db')
    } catch (err) {
      console.error('Batch error:', err)
      setIsProcessingBatch(false)
      setBatchError(err.message || 'Error executing generate_batch.py')
    }
  }

  async function verifyTokensWithDb() {
    setIsVerifyingSync(true)
    try {
      const currentParticipants = await fetchAllParticipants()
      const res = await fetch('/api/verify-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbParticipants: currentParticipants }),
      })
      const data = await res.json()
      setSyncVerification(data)
    } catch (e) {
      console.warn('Token verification error:', e)
    } finally {
      setIsVerifyingSync(false)
    }
  }

  async function handleResyncTokens() {
    if (!batchResult?.participants || isResyncing) return
    setIsResyncing(true)
    try {
      await adminAddParticipants(batchResult.participants)
      setResyncSuccess(true)
      if (onSync) onSync()
      await verifyTokensWithDb()
      setTimeout(() => setResyncSuccess(false), 3000)
    } catch (e) {
      console.error('Failed to resync tokens:', e)
    } finally {
      setIsResyncing(false)
    }
  }

  async function handleClearSentLog() {
    try {
      await fetch('/api/clear-sent-log', { method: 'POST' })
      setSentLogCount(0)
    } catch (e) {
      console.warn('Failed to clear sent log:', e)
    }
  }

  async function handleAddParticipantsToDatabase() {
    if (!batchResult?.participants || isAddingToDb) return
    setIsAddingToDb(true)
    setDbError(null)
    setShowSqlHelp(false)

    try {
      await adminAddParticipants(batchResult.participants)
      setIsAddingToDb(false)
      setDbSuccess(true)
      if (onSync) onSync()

      // Prompt to proceed to email step
      setTimeout(() => {
        setCurrentStep('send_emails')
      }, 700)
    } catch (err) {
      console.error('Add to DB error:', err)
      setIsAddingToDb(false)
      setDbError(err.message || 'Failed to insert participants into database.')
      if (err.isRpcMissing) {
        setShowSqlHelp(true)
      }
    }
  }

  async function handleSendEmails(forceOverride = false) {
    if (!isDryRun && (!senderEmail.trim() || !senderPassword.trim())) {
      return
    }

    const shouldForce = forceOverride === true || forceResend === true
    setCurrentStep('progress')
    setIsSendingEmails(true)
    setEmailCompleted(false)
    setEmailLogs([])
    setEmailProgress({
      current: 0,
      total: batchResult?.emailCount || 0,
      currentEmail: '',
      currentName: '',
    })

    try {
      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: senderEmail.trim(),
          senderPassword: senderPassword.trim(),
          dryRun: isDryRun,
          forceResend: shouldForce,
        }),
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP error ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let buffer = ''

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() // keep remainder

          for (const part of parts) {
            const line = part.trim()
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.substring(6))
                handleSseEvent(event)
              } catch (e) {
                console.warn('Failed to parse SSE line:', line, e)
              }
            }
          }
        }
      }

      setIsSendingEmails(false)
      setEmailCompleted(true)
    } catch (err) {
      console.error('Email send stream error:', err)
      setIsSendingEmails(false)
      setEmailCompleted(true)
      setEmailLogs((prev) => [...prev, { type: 'error', text: `Connection error: ${err.message}` }])
    }
  }

  function handleSseEvent(event) {
    if (event.type === 'progress') {
      setEmailProgress({
        current: event.current,
        total: event.total,
        currentEmail: event.email,
        currentName: event.name,
      })
      setEmailLogs((prev) => [
        ...prev,
        {
          type: 'info',
          text: `Sending to ${event.name} (${event.email})...`,
        },
      ])
    } else if (event.type === 'sent') {
      setEmailLogs((prev) => [
        ...prev,
        {
          type: 'success',
          text: `✓ ${event.message}`,
        },
      ])
    } else if (event.type === 'failed') {
      setEmailLogs((prev) => [
        ...prev,
        {
          type: 'error',
          text: `✗ ${event.message}`,
        },
      ])
    } else if (event.type === 'completed') {
      setCompletionStats({ sent: event.sent, failed: event.failed })
      setEmailLogs((prev) => [
        ...prev,
        {
          type: 'highlight',
          text: `🏁 Finished: ${event.sent} sent, ${event.failed} failed.`,
        },
      ])
    } else if (event.type === 'log') {
      setEmailLogs((prev) => [...prev, { type: 'log', text: event.message }])
    } else if (event.type === 'error') {
      setEmailLogs((prev) => [...prev, { type: 'error', text: event.message }])
    } else if (event.type === 'done') {
      setIsSendingEmails(false)
      setEmailCompleted(true)
    }
  }

  function handleCopySql() {
    navigator.clipboard.writeText(sqlCode)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2000)
  }

  const percent =
    emailProgress.total > 0
      ? Math.min(100, Math.round((emailProgress.current / emailProgress.total) * 100))
      : 0

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container automation-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="automation-modal-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-icon saffron-icon">🎟️</div>
          <div>
            <h2 id="automation-modal-title" className="modal-title">
              {currentStep === 'upload' && 'Import Participants & Email Automation'}
              {currentStep === 'add_db' && 'Step 1 of 2: Add to Database'}
              {currentStep === 'send_emails' && 'Step 2 of 2: Send Food Pass Emails'}
              {currentStep === 'progress' && (isDryRun ? 'Dry Run In Progress' : 'Sending Pass Emails…')}
            </h2>
            <p className="modal-subtitle">
              {currentStep === 'upload' && 'Upload participants.csv to generate unique tokens, QRs, and prepare passes'}
              {currentStep === 'add_db' && `Review and insert ${batchResult?.total || 0} participants into Supabase`}
              {currentStep === 'send_emails' && 'Send custom QR passes via Gmail SMTP to all valid emails'}
              {currentStep === 'progress' && 'Realtime email delivery progress'}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* STEP 1: UPLOAD / SELECT CSV */}
          {currentStep === 'upload' && (
            <div className="upload-step-view">
              <div
                className="drop-zone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const dropped = e.dataTransfer.files?.[0]
                  if (dropped) {
                    setFile(dropped)
                    const reader = new FileReader()
                    reader.onload = (ev) => processCsv(ev.target?.result)
                    reader.readAsText(dropped)
                  }
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={handleFileSelected}
                />
                <div className="drop-zone-icon">📁</div>
                <div className="drop-zone-title">
                  {file ? file.name : 'Click or drag & drop participants.csv here'}
                </div>
                <div className="drop-zone-desc">Required columns: name, reg_no (email optional for mail merge)</div>
              </div>

              <div className="or-divider">
                <span>OR</span>
              </div>

              <button
                type="button"
                className="load-existing-btn"
                onClick={handleUseExistingCsv}
                disabled={isProcessingBatch}
              >
                📄 Use existing <code>food event email automation/participants.csv</code>
              </button>

              {isProcessingBatch && (
                <div className="batch-processing-box">
                  <div className="spinner-small"></div>
                  <span>Running generate_batch.py — generating tokens, custom QR codes, and sheets…</span>
                </div>
              )}

              {batchError && (
                <div className="modal-error-box">
                  <span className="error-icon">✗</span> {batchError}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PROMPT TO ADD TO DATABASE */}
          {currentStep === 'add_db' && (
            <div className="add-db-step-view">
              <div className="step-badge-row">
                <span className="step-pill active">1. Database Import</span>
                <span className="step-pill-arrow">→</span>
                <span className="step-pill">2. Email Delivery</span>
              </div>

              <div className="batch-summary-card">
                <div className="summary-stat">
                  <span className="stat-big">{batchResult?.total || 0}</span>
                  <span className="stat-desc">Total Participants Generated</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-big text-green">{batchResult?.emailCount || 0}</span>
                  <span className="stat-desc">Recipients with Valid Emails</span>
                </div>
              </div>

              <div className="preview-table-container">
                <div className="preview-table-header">Preview generated participants:</div>
                <table className="mini-preview-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Name</th>
                      <th>Reg No</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(batchResult?.participants || []).slice(0, 5).map((p, idx) => (
                      <tr key={idx}>
                        <td><code>{p.token}</code></td>
                        <td>{p.name}</td>
                        <td>{p.reg_no || '—'}</td>
                        <td>{p.email || <span className="muted-text">None</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(batchResult?.participants?.length || 0) > 5 && (
                  <div className="table-more-hint">
                    + {(batchResult?.participants?.length || 0) - 5} more participants
                  </div>
                )}
              </div>

              {dbError && (
                <div className="modal-error-box">
                  <span className="error-icon">✗</span> {dbError}
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
                    Paste this into Supabase Dashboard → <strong>SQL Editor</strong> and click Run.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PROMPT TO SEND EMAILS */}
          {currentStep === 'send_emails' && (
            <div className="send-emails-step-view">
              <div className="step-badge-row">
                <span className="step-pill completed">✓ 1. Added to Database</span>
                <span className="step-pill-arrow">→</span>
                <span className="step-pill active">2. Email Delivery</span>
              </div>

              <div className="email-config-notice">
                <p>
                  Ready to send custom passes to <strong>{batchResult?.emailCount || 0}</strong> participants from{' '}
                  <code>participant_emails.csv</code>. Each email includes their personal QR code attached.
                </p>
              </div>

              {/* TOKEN SYNC VERIFICATION STATUS */}
              {isVerifyingSync && (
                <div className="verifying-tokens-box">
                  <div className="spinner-small" /> Checking QR pass tokens against Supabase database…
                </div>
              )}

              {!isVerifyingSync && syncVerification && !syncVerification.inSync && (
                <div className="token-mismatch-warning">
                  <div className="token-mismatch-header">
                    <span className="token-mismatch-icon">⚠️</span>
                    <strong>Token Mismatch Detected</strong>
                  </div>
                  <p>
                    {syncVerification.mismatches?.length || 0} participant(s) in <code>participant_emails.csv</code> have
                    different tokens in the Supabase database. If emailed now, scanner will show <em>"NOT FOUND: This code isn't in the system"</em>!
                  </p>
                  <div className="token-mismatch-actions">
                    <button
                      type="button"
                      className="resync-tokens-btn"
                      onClick={handleResyncTokens}
                      disabled={isResyncing}
                    >
                      {isResyncing ? 'Updating Database...' : '🔄 Sync Database With Generated Passes'}
                    </button>
                    {resyncSuccess && <span className="resync-success-msg">✓ Database synced successfully!</span>}
                  </div>
                </div>
              )}

              {!isVerifyingSync && syncVerification && syncVerification.inSync && (
                <div className="token-verified-badge">
                  <span className="token-verified-icon">✓</span>
                  <span>
                    Verified: All {syncVerification.totalEmails} pass tokens match the Supabase database. Passes will scan successfully.
                  </span>
                </div>
              )}

              <div className="template-accordion">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <button
                    type="button"
                    className="template-toggle-btn"
                    style={{ flex: 1 }}
                    onClick={() => setShowTemplatePreview((prev) => !prev)}
                  >
                    <span>✉️ Email Template ({templateInfo.subject})</span>
                    <span>{showTemplatePreview ? '▲' : '▼'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchStatusAndTemplate}
                    disabled={isRefreshingTemplate}
                    title="Reload template and poster from disk"
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#334155',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isRefreshingTemplate ? 'Refreshing...' : '🔄 Reload'}
                  </button>
                </div>
                {showTemplatePreview && (
                  <div className="template-preview-box">
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Subject:</strong> {templateInfo.subject}
                    </div>
                    <pre>{templateInfo.body}</pre>
                    {hasPoster && (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '10px 14px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#166534',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>🖼️</span>
                        <div>
                          <strong>poster.png detected:</strong> Directly embedded inline into each email body (not sent as an attachment).
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="gmail-address-input">
                  Your Gmail Address:
                </label>
                <input
                  id="gmail-address-input"
                  type="email"
                  className="styled-input"
                  placeholder="e.g. yourname@gmail.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="gmail-app-password-input">
                  Gmail App Password:
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="gmail-app-password-input"
                    type={showPassword ? 'text' : 'password'}
                    className="styled-input password-input"
                    placeholder="16-character Google App Password"
                    value={senderPassword}
                    onChange={(e) => setSenderPassword(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <span className="field-hint">
                  Generated at <strong>myaccount.google.com/apppasswords</strong> (your regular account password will not
                  work).
                </span>
              </div>

              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isDryRun}
                    onChange={(e) => setIsDryRun(e.target.checked)}
                  />
                  <span>Dry run only (verify attachments and templates without sending live emails)</span>
                </label>
              </div>

              {sentLogCount > 0 && (
                <div className="sent-log-warning-card">
                  <div className="sent-log-warning-header">
                    <span>ℹ️</span>
                    <strong>{sentLogCount} recipient(s) previously logged in sent_log.txt</strong>
                  </div>
                  <p>
                    By default, the script skips recipients who were already emailed. Check &quot;Resend to all&quot; below or clear the log to re-deliver passes.
                  </p>
                  <button
                    type="button"
                    className="clear-sent-log-btn"
                    onClick={handleClearSentLog}
                  >
                    🗑️ Clear Sent Log
                  </button>
                </div>
              )}

              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={forceResend}
                    onChange={(e) => setForceResend(e.target.checked)}
                  />
                  <span>
                    <strong>Resend to all</strong> (ignore sent log and send passes to everyone)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: LIVE PROGRESS BAR & LOGS */}
          {currentStep === 'progress' && (
            <div className="progress-step-view">
              <div className="progress-card">
                <div className="progress-meta">
                  <span className="progress-count">
                    {emailProgress.current} / {emailProgress.total} emails sent ({percent}%)
                  </span>
                  <span className="progress-status-badge">
                    {emailCompleted ? 'Completed' : isSendingEmails ? 'Sending…' : 'Idle'}
                  </span>
                </div>

                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${percent}%` }}></div>
                </div>

                {emailProgress.currentName && !emailCompleted && (
                  <div className="progress-current-recipient">
                    <span>Sending to:</span> <strong>{emailProgress.currentName}</strong> ({emailProgress.currentEmail})
                  </div>
                )}
              </div>

              <div className="live-logs-container" ref={logScrollRef}>
                <div className="logs-label">Live Activity Stream:</div>
                <div className="live-logs-scroll">
                  {emailLogs.map((item, idx) => (
                    <div key={idx} className={`log-entry ${item.type}`}>
                      {item.text}
                    </div>
                  ))}
                  {emailLogs.length === 0 && (
                    <div className="log-placeholder">Connecting to SMTP server…</div>
                  )}
                </div>
              </div>

              {emailCompleted && completionStats.sent === 0 && (
                <div className="zero-sent-notice">
                  <div className="zero-sent-header">
                    <span>⚠️</span>
                    <strong>0 Emails Sent — All Skipped</strong>
                  </div>
                  <p>
                    All recipients were skipped because they are already recorded in <code>sent_log.txt</code>.
                  </p>
                  <button
                    type="button"
                    className="force-resend-now-btn"
                    onClick={() => {
                      setForceResend(true)
                      handleSendEmails(true)
                    }}
                  >
                    🔄 Force Resend to All Now
                  </button>
                </div>
              )}

              {emailCompleted && completionStats.sent > 0 && (
                <div className="completion-banner">
                  <span className="banner-icon">✓</span>
                  <div>
                    <strong>Process Completed!</strong>
                    <div>
                      {completionStats.sent} emails successfully processed.
                      {completionStats.failed > 0 && ` (${completionStats.failed} failed)`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {currentStep === 'upload' && (
            <button type="button" className="modal-btn secondary-btn" onClick={onClose}>
              Cancel
            </button>
          )}

          {currentStep === 'add_db' && (
            <>
              <button
                type="button"
                className="modal-btn secondary-btn"
                onClick={() => setCurrentStep('send_emails')}
                disabled={isAddingToDb}
              >
                Skip DB & Go to Emails →
              </button>
              <button
                type="button"
                className="modal-btn primary-action-btn"
                onClick={handleAddParticipantsToDatabase}
                disabled={isAddingToDb || dbSuccess}
              >
                {isAddingToDb ? (
                  'Adding to Database…'
                ) : dbSuccess ? (
                  '✓ Added to Database!'
                ) : (
                  `Add ${batchResult?.total || 0} Participants to Database`
                )}
              </button>
            </>
          )}

          {currentStep === 'send_emails' && (
            <>
              <button type="button" className="modal-btn secondary-btn" onClick={onClose}>
                Done / Skip Emails
              </button>
              <button
                type="button"
                className="modal-btn primary-action-btn"
                onClick={() => handleSendEmails(false)}
                disabled={!isDryRun && (!senderEmail.trim() || !senderPassword.trim())}
              >
                {isDryRun
                  ? 'Run Dry-Run Verification'
                  : `Send Emails to All (${batchResult?.emailCount || 0})`}
              </button>
            </>
          )}

          {currentStep === 'progress' && (
            <>
              {emailCompleted && (
                <button
                  type="button"
                  className="modal-btn secondary-btn"
                  onClick={() => setCurrentStep('send_emails')}
                >
                  ← Back to Email Settings
                </button>
              )}
              {emailCompleted && completionStats.sent === 0 && (
                <button
                  type="button"
                  className="modal-btn primary-action-btn"
                  onClick={() => {
                    setForceResend(true)
                    handleSendEmails(true)
                  }}
                >
                  🔄 Force Resend to All
                </button>
              )}
              <button
                type="button"
                className={`modal-btn ${completionStats.sent === 0 ? 'secondary-btn' : 'primary-action-btn'}`}
                onClick={onClose}
                disabled={isSendingEmails}
              >
                {emailCompleted ? 'Done / Close' : 'Sending in progress…'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
