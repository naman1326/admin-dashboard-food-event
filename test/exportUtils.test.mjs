import assert from 'node:assert/strict'
import {
  formatScanDateTime,
  getParticipantOverallStatus,
  prepareParticipantsExportData,
  prepareScansExportData,
  prepareSummaryExportData,
  prepareLogsExportData,
  generateCsvString,
  getExportFilename,
} from '../src/exportUtils.js'
import { buildGrid } from '../src/dashboardLogic.js'

let passed = 0
function check(label, actual, expected) {
  assert.deepEqual(actual, expected, label)
  passed++
  console.log('  ok -', label)
}

console.log('formatScanDateTime:')
check('empty input returns empty string', formatScanDateTime(null), '')
check('invalid date returns empty string', formatScanDateTime('invalid'), '')
const formattedDate = formatScanDateTime('2026-07-12T10:00:00Z')
check('valid date formats to string', typeof formattedDate, 'string')
assert.ok(formattedDate.length > 5, 'formatted date should not be empty')

console.log('\ngetParticipantOverallStatus:')
const checkpoints = [
  { id: 1, code: 'ENTRY', label: 'Entry', sort_order: 0 },
  { id: 2, code: 'PLATE', label: 'Plate', sort_order: 1 },
]

const participants = [
  { id: 10, token: 'tok-1', name: 'Asha Rao', reg_no: 'REG-01' },
  { id: 11, token: 'tok-2', name: 'Vikram Iyer', reg_no: 'REG-02' },
  { id: 12, token: 'tok-3', name: 'Meera Nair', reg_no: 'REG-03' },
]

const scans = [
  { id: 100, participant_id: 10, checkpoint_id: 1, scanned_at: '2026-07-12T10:00:00Z', method: 'scan', device_label: 'Gate 1' },
  { id: 101, participant_id: 11, checkpoint_id: 1, scanned_at: '2026-07-12T10:01:00Z', method: 'scan', device_label: 'Gate 1' },
  { id: 102, participant_id: 11, checkpoint_id: 2, scanned_at: '2026-07-12T10:05:00Z', method: 'manual', device_label: null },
]

const grid = buildGrid(participants, checkpoints, scans)

check('Asha (entry only) status is Entered (No food)', getParticipantOverallStatus(grid[0], checkpoints), 'Entered (No food)')
check('Vikram (entry + plate) status is Fully Done', getParticipantOverallStatus(grid[1], checkpoints), 'Fully Done')
check('Meera (no scans) status is Not Started', getParticipantOverallStatus(grid[2], checkpoints), 'Not Started')

console.log('\nprepareParticipantsExportData:')
const prep = prepareParticipantsExportData(grid, checkpoints)
check('headers contain Registration No, Name, Token, Overall Status, Completed Checkpoints, and checkpoint columns', prep.headers, [
  'Registration No',
  'Name',
  'Token',
  'Overall Status',
  'Completed Checkpoints',
  'Entry - Status',
  'Entry - Time',
  'Entry - Method',
  'Entry - Scanned By',
  'Plate - Status',
  'Plate - Time',
  'Plate - Method',
  'Plate - Scanned By',
])

check('3 rows returned', prep.rows.length, 3)

// Check Asha's row
const ashaRow = prep.rows[0]
check('Asha reg_no', ashaRow[0], 'REG-01')
check('Asha name', ashaRow[1], 'Asha Rao')
check('Asha token', ashaRow[2], 'tok-1')
check('Asha status', ashaRow[3], 'Entered (No food)')
check('Asha progress', ashaRow[4], '1 / 2')
check('Asha Entry status', ashaRow[5], 'Done')
check('Asha Entry method', ashaRow[7], 'scan')
check('Asha Entry device', ashaRow[8], 'Gate 1')
check('Asha Plate status', ashaRow[9], 'Pending')
check('Asha Plate time', ashaRow[10], '')

// Check Vikram's row
const vikramRow = prep.rows[1]
check('Vikram Plate status', vikramRow[9], 'Done')
check('Vikram Plate method', vikramRow[11], 'manual')
check('Vikram Plate scanned by manual falls back to Manual Admin', vikramRow[12], 'Manual Admin')

console.log('\nprepareScansExportData:')
const scansPrep = prepareScansExportData(scans, participants, checkpoints)
check('scans headers', scansPrep.headers, [
  'Scan ID',
  'Registration No',
  'Participant Name',
  'Checkpoint',
  'Checkpoint Code',
  'Scanned At',
  'Method',
  'Scanned By / Device',
])
check('3 scan rows', scansPrep.rows.length, 3)
check('scan row 1 matches', scansPrep.rows[0][1], 'REG-01')
check('scan row 1 checkpoint label', scansPrep.rows[0][3], 'Entry')

console.log('\nprepareSummaryExportData:')
const stats = { total: 3, fullyDone: 1, notStarted: 1, perCheckpoint: { ENTRY: 2, PLATE: 1 } }
const summaryPrep = prepareSummaryExportData(stats, checkpoints)
check('summary rows count', summaryPrep.rows.length, 7)

console.log('\nprepareLogsExportData:')
const logs = [
  {
    id: 1,
    action: 'confirm',
    participants: { name: 'Asha Rao', reg_no: 'REG-01' },
    checkpoints: { code: 'PLATE', label: 'Plate' },
    note: 'Marked from admin dashboard',
    created_at: '2026-07-12T10:00:00Z',
  },
]
const logsPrep = prepareLogsExportData(logs)
check('logs headers', logsPrep.headers.length, 7)
check('log row matches', logsPrep.rows[0][1], 'confirm')

console.log('\ngenerateCsvString:')
const sampleHeaders = ['Name', 'Reg No', 'Note']
const sampleRows = [
  ['Asha, Rao', 'REG-01', 'Quoted "value" here'],
  ['Vikram\nIyer', 'REG-02', 'Simple note'],
]
const csvStr = generateCsvString(sampleHeaders, sampleRows)
assert.ok(csvStr.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM')
assert.ok(csvStr.includes('"Asha, Rao"'), 'commas in values must be quoted')
assert.ok(csvStr.includes('""value""'), 'internal quotes must be escaped')
assert.ok(csvStr.includes('"Vikram\nIyer"'), 'newlines in values must be quoted')
passed++
console.log('  ok - CSV formatting and escaping')

console.log('\ngetExportFilename:')
const filename = getExportFilename('food_pass_test', 'csv')
assert.ok(filename.startsWith('food_pass_test_'), 'filename starts with prefix')
assert.ok(filename.endsWith('.csv'), 'filename ends with extension')
passed++
console.log('  ok - filename generation')

console.log(`\nAll ${passed} exportUtils tests passed!`)
