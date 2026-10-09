import { useState, useEffect, useMemo, useCallback } from 'react'
import PasswordGate from './components/PasswordGate.jsx'
import DashboardHeader from './components/DashboardHeader.jsx'
import SearchFilterBar from './components/SearchFilterBar.jsx'
import ParticipantGrid from './components/ParticipantGrid.jsx'
import ParticipantDetail from './components/ParticipantDetail.jsx'
import LogsView from './components/LogsView.jsx'
import DeleteParticipantsModal from './components/DeleteParticipantsModal.jsx'
import ParticipantImportModal from './components/ParticipantImportModal.jsx'
import { configError, fetchAll, subscribeToScans } from './supabaseClient.js'
import { buildGrid, computeStats, filterRows, applyScanEvent, FILTERS } from './dashboardLogic.js'

const AUTH_KEY = 'foodpass_admin_authed'
const FLASH_MS = 1200

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === 'true')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [participants, setParticipants] = useState([])
  const [checkpoints, setCheckpoints] = useState([])
  const [scans, setScans] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(FILTERS.ALL)
  const [selectedId, setSelectedId] = useState(null)
  const [flashIds, setFlashIds] = useState(new Set())
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const [liveStatus, setLiveStatus] = useState('connecting')

  const load = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchAll()
      setParticipants(data.participants)
      setCheckpoints(data.checkpoints)
      setScans(data.scans)
    } catch (err) {
      console.error(err)
      if (!isSilent) setLoadError(err.message)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [])

  const isLogsPage = window.location.search === '?page=logs'

  useEffect(() => {
    if (authed && !isLogsPage) load(false)
  }, [authed, load, isLogsPage])

  useEffect(() => {
    if (!authed || isLogsPage) return undefined

    const unsubscribe = subscribeToScans(
      (eventType, payload) => {
        setScans((prev) => applyScanEvent(prev, eventType, payload))
        const pid = eventType === 'INSERT' ? payload.new?.participant_id : payload.old?.participant_id
        if (!pid) return
        setFlashIds((prev) => new Set(prev).add(pid))
        setTimeout(() => {
          setFlashIds((prev) => {
            const next = new Set(prev)
            next.delete(pid)
            return next
          })
        }, FLASH_MS)
      },
      (status) => {
        if (status === 'SUBSCRIBED') {
          setLiveStatus('connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setLiveStatus('disconnected')
          load(true)
        } else {
          setLiveStatus('connecting')
        }
      }
    )

    // Periodic sync every 30 seconds sends read calls to the database and keeps stats fresh
    const interval = setInterval(() => {
      load(true)
    }, 30000)

    // Send read call to refresh data when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        load(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      unsubscribe()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [authed, isLogsPage, load])

  const grid = useMemo(() => buildGrid(participants, checkpoints, scans), [participants, checkpoints, scans])
  const stats = useMemo(() => computeStats(grid, checkpoints), [grid, checkpoints])
  const visibleRows = useMemo(
    () => filterRows(grid, checkpoints, { query, filter }),
    [grid, checkpoints, query, filter]
  )
  const selectedRow = useMemo(() => grid.find((r) => r.id === selectedId) || null, [grid, selectedId])

  if (configError) {
    return (
      <div className="fatal-screen">
        <p className="eyebrow">Setup needed</p>
        <h1 className="fatal-headline">{configError}</h1>
      </div>
    )
  }

  if (!authed) {
    return (
      <PasswordGate
        onSuccess={() => {
          sessionStorage.setItem(AUTH_KEY, 'true')
          setAuthed(true)
        }}
      />
    )
  }

  if (isLogsPage) {
    return <LogsView />
  }

  return (
    <div className="dashboard">
      <DashboardHeader
        stats={stats}
        checkpoints={checkpoints}
        onRefresh={load}
        loading={loading}
        liveStatus={liveStatus}
        allRows={grid}
        filteredRows={visibleRows}
        scans={scans}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenDelete={() => setIsDeleteModalOpen(true)}
      />
      <SearchFilterBar
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={setFilter}
        resultCount={visibleRows.length}
      />

      {loadError && <p className="dashboard-status is-error">{loadError}</p>}
      {loading && participants.length === 0 && !loadError && <p className="dashboard-status">Loading…</p>}

      {!loadError && !(loading && participants.length === 0) && (
        <ParticipantGrid
          rows={visibleRows}
          checkpoints={checkpoints}
          flashIds={flashIds}
          onSelect={(row) => setSelectedId(row.id)}
        />
      )}

      {selectedRow && (
        <ParticipantDetail
          participant={selectedRow}
          onClose={() => setSelectedId(null)}
          onSync={() => load(true)}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteParticipantsModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onDeleted={() => load(false)}
        />
      )}

      {isImportModalOpen && (
        <ParticipantImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSync={() => load(true)}
        />
      )}
    </div>
  )
}
