import assert from 'node:assert/strict'
import { buildGrid, computeStats, filterRows, applyScanEvent, formatScanTime, FILTERS } from '../src/dashboardLogic.js'

let passed = 0
function check(label, actual, expected) {
  assert.deepEqual(actual, expected, label)
  passed++
  console.log('  ok -', label)
}

const checkpoints = [
  { id: 1, code: 'ENTRY', label: 'Entry', sort_order: 0 },
  { id: 2, code: 'PLATE', label: 'Plate', sort_order: 1 },
]

const participants = [
  { id: 10, token: 'demo-01', name: 'Asha Rao', reg_no: 'REG-01' },
  { id: 11, token: 'demo-02', name: 'Vikram Iyer', reg_no: 'REG-02' },
  { id: 12, token: 'demo-03', name: 'Meera Nair', reg_no: 'REG-03' },
]

const scans = [
  { id: 100, participant_id: 10, checkpoint_id: 1, scanned_at: '2026-07-12T10:00:00Z' }, // Asha: entry only
  { id: 101, participant_id: 11, checkpoint_id: 1, scanned_at: '2026-07-12T10:01:00Z' }, // Vikram: entry
  { id: 102, participant_id: 11, checkpoint_id: 2, scanned_at: '2026-07-12T10:05:00Z' }, // Vikram: + plate = fully done
]

console.log('buildGrid:')

const grid = buildGrid(participants, checkpoints, scans)

check('every participant appears exactly once', grid.length, 3)

check(
  "Asha's status: entry done, plate not done",
  grid.find((r) => r.name === 'Asha Rao').checkpointStatus.map((cs) => Boolean(cs.scan)),
  [true, false]
)

check(
  "Meera has no scans at all -> both checkpoints false",
  grid.find((r) => r.name === 'Meera Nair').checkpointStatus.map((cs) => Boolean(cs.scan)),
  [false, false]
)

console.log('\ncomputeStats:')

const stats = computeStats(grid, checkpoints)

check('total participant count', stats.total, 3)
check('per-checkpoint counts', stats.perCheckpoint, { ENTRY: 2, PLATE: 1 })
check('exactly one participant fully done (Vikram)', stats.fullyDone, 1)
check('exactly one participant hasn\'t started (Meera)', stats.notStarted, 1)

console.log('\nfilterRows:')

check(
  'search by partial name is case-insensitive',
  filterRows(grid, checkpoints, { query: 'asha' }).map((r) => r.name),
  ['Asha Rao']
)

check(
  'search by reg no',
  filterRows(grid, checkpoints, { query: 'REG-03' }).map((r) => r.name),
  ['Meera Nair']
)

check(
  'NOT_ENTERED catches only Meera',
  filterRows(grid, checkpoints, { filter: FILTERS.NOT_ENTERED }).map((r) => r.name),
  ['Meera Nair']
)

check(
  'ENTERED_NO_FOOD catches only Asha (entered, no plate yet)',
  filterRows(grid, checkpoints, { filter: FILTERS.ENTERED_NO_FOOD }).map((r) => r.name),
  ['Asha Rao']
)

check(
  'FULLY_DONE catches only Vikram',
  filterRows(grid, checkpoints, { filter: FILTERS.FULLY_DONE }).map((r) => r.name),
  ['Vikram Iyer']
)

check(
  'ANY_TICKED catches Asha and Vikram (any counter ticked)',
  filterRows(grid, checkpoints, { filter: FILTERS.ANY_TICKED }).map((r) => r.name),
  ['Asha Rao', 'Vikram Iyer']
)

check(
  'ONLY_ONE catches only Asha (exactly one counter ticked)',
  filterRows(grid, checkpoints, { filter: FILTERS.ONLY_ONE }).map((r) => r.name),
  ['Asha Rao']
)

check(
  'PARTIALLY_DONE catches Asha (started but not all checkpoints done)',
  filterRows(grid, checkpoints, { filter: FILTERS.PARTIALLY_DONE }).map((r) => r.name),
  ['Asha Rao']
)

check(
  'query and filter combine (AND, not OR)',
  filterRows(grid, checkpoints, { query: 'vikram', filter: FILTERS.NOT_ENTERED }).map((r) => r.name),
  [] // Vikram matches the name but not the filter, so nothing should match
)

console.log('\napplyScanEvent:')

const afterInsert = applyScanEvent(scans, 'INSERT', {
  new: { id: 200, participant_id: 12, checkpoint_id: 1, scanned_at: '2026-07-12T11:00:00Z' },
})
check('INSERT appends the new scan', afterInsert.length, 4)

const noDuplicateInsert = applyScanEvent(afterInsert, 'INSERT', {
  new: { id: 200, participant_id: 12, checkpoint_id: 1, scanned_at: '2026-07-12T11:00:00Z' },
})
check('re-delivering the same INSERT does not duplicate it', noDuplicateInsert.length, 4)

const afterDelete = applyScanEvent(scans, 'DELETE', { old: { id: 101 } })
check(
  'DELETE removes only the matching row by id',
  afterDelete.map((s) => s.id),
  [100, 102]
)

const afterUpdate = applyScanEvent(scans, 'UPDATE', {
  new: { id: 100, participant_id: 10, checkpoint_id: 1, scanned_at: '2026-07-12T10:00:00Z', method: 'manual' }
})
check('UPDATE modifies matching scan by id', afterUpdate.find((s) => s.id === 100)?.method, 'manual')

check('original scans array is never mutated', scans.length, 3)

console.log('\nformatScanTime:')

check('formats a real timestamp as a string', typeof formatScanTime('2026-07-12T10:00:00Z'), 'string')
check('missing input returns empty, not "Invalid Date"', formatScanTime(undefined), '')

console.log(`\n${passed}/${passed} checks passed`)
