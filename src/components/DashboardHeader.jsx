import ExportButton from './ExportButton.jsx'

export default function DashboardHeader({
  stats,
  checkpoints,
  onRefresh,
  loading,
  liveStatus = 'connected',
  allRows = [],
  filteredRows = [],
  scans = [],
}) {
  const isConnecting = liveStatus === 'connecting'
  const isDisconnected = liveStatus === 'disconnected'

  return (
    <header className="dash-header">
      <div className="dash-header-top">
        <div className="dash-brand-container">
          <img src="/logo.png" alt="Swarajya Logo" className="dash-logo" />
          <div className="dash-brand-text">
            <h1 className="brand-title">स्वराज्य</h1>
            <p className="brand-subtitle">Swarajya Food Pass Admin</p>
          </div>
        </div>
        <div className="dash-actions">
          <div
            className={`live-indicator-container ${isConnecting ? 'is-connecting' : isDisconnected ? 'is-disconnected' : ''}`}
            title={isDisconnected ? 'Realtime disconnected — syncing via periodic read calls' : isConnecting ? 'Connecting to realtime feed...' : 'Connected to realtime feed'}
          >
            <span className="live-dot"></span>
            <span className="live-text">
              {isDisconnected ? 'Offline (Syncing)' : isConnecting ? 'Connecting…' : 'Live Status'}
            </span>
          </div>
          <ExportButton
            allRows={allRows}
            filteredRows={filteredRows}
            checkpoints={checkpoints}
            scans={scans}
            stats={stats}
            disabled={loading}
          />
          <button
            type="button"
            className="refresh-button logs-btn"
            onClick={() => window.open('?page=logs', '_blank', 'width=1000,height=700,noopener,noreferrer')}
          >
            Override Logs
          </button>
          <button type="button" className="refresh-button" onClick={() => onRefresh(false)} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="stat-strip">
        <div className="stat-card stat-card-total">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">registered</span>
        </div>
        {checkpoints.map((c) => (
          <div key={c.code} className="stat-card">
            <span className="stat-number">{stats.perCheckpoint[c.code] ?? 0}</span>
            <span className="stat-label">{c.label}</span>
          </div>
        ))}
        <div className="stat-card stat-card-done">
          <span className="stat-number">{stats.fullyDone}</span>
          <span className="stat-label">fully done</span>
        </div>
      </div>
    </header>
  )
}
