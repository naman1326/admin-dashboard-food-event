// Turns raw participants/checkpoints/scans arrays into the shapes the UI needs.
// Pure functions only — no network, no React — so they're cheap to unit test.

export function buildGrid(participants, checkpoints, scans) {
  const scanMap = new Map()
  for (const s of scans) {
    scanMap.set(`${s.participant_id}:${s.checkpoint_id}`, s)
  }
  return participants.map((p) => ({
    ...p,
    checkpointStatus: checkpoints.map((c) => ({
      checkpointId: c.id,
      code: c.code,
      label: c.label,
      scan: scanMap.get(`${p.id}:${c.id}`) || null,
    })),
  }))
}

export function computeStats(gridRows, checkpoints) {
  const perCheckpoint = Object.fromEntries(checkpoints.map((c) => [c.code, 0]))
  let fullyDone = 0
  let notStarted = 0

  for (const row of gridRows) {
    let doneCount = 0
    for (const cs of row.checkpointStatus) {
      if (cs.scan) {
        perCheckpoint[cs.code] += 1
        doneCount += 1
      }
    }
    if (checkpoints.length > 0 && doneCount === checkpoints.length) fullyDone += 1
    if (doneCount === 0) notStarted += 1
  }

  return { total: gridRows.length, perCheckpoint, fullyDone, notStarted }
}

export const FILTERS = {
  ALL: 'all',
  ANY_TICKED: 'any_ticked',
  ONLY_ONE: 'only_one',
  PARTIALLY_DONE: 'partially_done',
  NOT_ENTERED: 'not_entered',
  ENTERED_NO_FOOD: 'entered_no_food',
  FULLY_DONE: 'fully_done',
}

// "Entry" isn't hardcoded by name — it's whichever checkpoint sorts first,
// same convention the rest of the system uses.
export function filterRows(gridRows, checkpoints, { query = '', filter = FILTERS.ALL } = {}) {
  let rows = gridRows
  const entryCode = checkpoints[0]?.code

  const q = query.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.reg_no || '').toLowerCase().includes(q)
    )
  }

  if (filter === FILTERS.NOT_ENTERED && entryCode) {
    rows = rows.filter((r) => !r.checkpointStatus.find((cs) => cs.code === entryCode)?.scan)
  } else if (filter === FILTERS.ENTERED_NO_FOOD && entryCode) {
    rows = rows.filter((r) => {
      const entered = r.checkpointStatus.find((cs) => cs.code === entryCode)?.scan
      const anyFood = r.checkpointStatus.some((cs) => cs.code !== entryCode && cs.scan)
      return entered && !anyFood
    })
  } else if (filter === FILTERS.FULLY_DONE) {
    rows = rows.filter(
      (r) => r.checkpointStatus.length > 0 && r.checkpointStatus.every((cs) => cs.scan)
    )
  } else if (filter === FILTERS.ANY_TICKED) {
    rows = rows.filter((r) => r.checkpointStatus.some((cs) => cs.scan))
  } else if (filter === FILTERS.ONLY_ONE) {
    rows = rows.filter((r) => r.checkpointStatus.filter((cs) => cs.scan).length === 1)
  } else if (filter === FILTERS.PARTIALLY_DONE) {
    rows = rows.filter((r) => {
      const doneCount = r.checkpointStatus.filter((cs) => cs.scan).length
      return doneCount > 0 && doneCount < r.checkpointStatus.length
    })
  }

  return rows
}

// Applies one realtime INSERT, UPDATE, or DELETE event to a local scans array without
// needing to refetch everything. Returns a new array (never mutates).
export function applyScanEvent(scans, eventType, payload) {
  if (eventType === 'INSERT') {
    if (scans.some((s) => s.id === payload.new.id)) return scans // already have it
    return [...scans, payload.new]
  }
  if (eventType === 'DELETE') {
    return scans.filter((s) => s.id !== payload.old.id)
  }
  if (eventType === 'UPDATE') {
    return scans.map((s) => (s.id === payload.new.id ? payload.new : s))
  }
  return scans
}

export function formatScanTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
