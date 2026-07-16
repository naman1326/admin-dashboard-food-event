import { useState, useEffect } from 'react'
import { formatScanTime } from '../dashboardLogic.js'

export default function ParticipantGrid({ rows, checkpoints, flashIds, onSelect }) {
  const [openDropdown, setOpenDropdown] = useState(null) // { rowId, checkpointId }

  useEffect(() => {
    if (!openDropdown) return
    const handleClose = () => setOpenDropdown(null)
    window.addEventListener('click', handleClose)
    return () => window.removeEventListener('click', handleClose)
  }, [openDropdown])

  if (rows.length === 0) {
    return <p className="grid-empty">No participants match this search or filter.</p>
  }

  return (
    <div className="grid-scroll">
      <table className="participant-table">
        <thead>
          <tr>
            <th className="col-name">Name</th>
            <th className="col-reg">Reg. no.</th>
            {checkpoints.map((c) => (
              <th key={c.code} className="col-checkpoint">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={flashIds.has(row.id) ? 'is-flashing' : ''} onClick={() => onSelect(row)}>
              <td className="col-name">{row.name}</td>
              <td className="col-reg">{row.reg_no}</td>
              {row.checkpointStatus.map((cs) => {
                const isOpen = openDropdown?.rowId === row.id && openDropdown?.checkpointId === cs.checkpointId
                return (
                  <td key={cs.checkpointId} className="col-checkpoint">
                    <div className="checkpoint-cell">
                      <span
                        className={`status-dot ${cs.scan ? 'is-done' : ''}`}
                        role="img"
                        aria-label={cs.scan ? `${cs.label} done` : `${cs.label} not done`}
                      />
                      <button
                        type="button"
                        className={`checkpoint-dropdown-btn ${isOpen ? 'is-active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenDropdown(isOpen ? null : { rowId: row.id, checkpointId: cs.checkpointId })
                        }}
                        aria-expanded={isOpen}
                        title="View scan details"
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>

                      {isOpen && (
                        <div className="checkpoint-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                          <div className="dropdown-header">{cs.label}</div>
                          <div className="dropdown-divider" />
                          {cs.scan ? (
                            <div className="dropdown-body">
                              <div className="dropdown-info-item">
                                <span className="info-label">Scanned By:</span>
                                <span className="info-value highlight">
                                  {cs.scan.device_label || (cs.scan.method === 'manual' ? 'Manual Admin' : 'System')}
                                </span>
                              </div>
                              <div className="dropdown-info-item">
                                <span className="info-label">Time:</span>
                                <span className="info-value">{formatScanTime(cs.scan.scanned_at) || 'N/A'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="dropdown-body">
                              <div className="dropdown-info-item">
                                <span className="info-label">Status:</span>
                                <span className="info-value is-pending">Not scanned</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
