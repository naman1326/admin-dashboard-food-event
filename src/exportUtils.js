export function formatScanDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

export function getParticipantOverallStatus(row, checkpoints = []) {
  const total = checkpoints.length
  if (total === 0) return 'N/A'

  const doneCount = (row.checkpointStatus || []).filter((cs) => cs.scan).length
  if (doneCount === total) return 'Fully Done'
  if (doneCount === 0) return 'Not Started'

  const entryCode = checkpoints[0]?.code
  if (entryCode) {
    const entered = row.checkpointStatus?.find((cs) => cs.code === entryCode)?.scan
    const anyFood = row.checkpointStatus?.some((cs) => cs.code !== entryCode && cs.scan)
    if (entered && !anyFood) return 'Entered (No food)'
  }

  return 'Partially Done'
}

export function prepareParticipantsExportData(rows = [], checkpoints = []) {
  // Check if any participants have optional metadata fields
  const hasToken = rows.some((r) => r.token)
  const hasCollege = rows.some((r) => r.college)
  const hasPhone = rows.some((r) => r.phone)
  const hasEmail = rows.some((r) => r.email)

  const headers = ['Registration No', 'Name']
  if (hasCollege) headers.push('College')
  if (hasPhone) headers.push('Phone')
  if (hasEmail) headers.push('Email')
  if (hasToken) headers.push('Token')

  headers.push('Overall Status', 'Completed Checkpoints')

  for (const c of checkpoints) {
    headers.push(`${c.label} - Status`)
    headers.push(`${c.label} - Time`)
    headers.push(`${c.label} - Method`)
    headers.push(`${c.label} - Scanned By`)
  }

  const exportRows = rows.map((r) => {
    const doneCount = (r.checkpointStatus || []).filter((cs) => cs.scan).length
    const overallStatus = getParticipantOverallStatus(r, checkpoints)
    const progress = `${doneCount} / ${checkpoints.length}`

    const rowData = [r.reg_no || '', r.name || '']
    if (hasCollege) rowData.push(r.college || '')
    if (hasPhone) rowData.push(r.phone || '')
    if (hasEmail) rowData.push(r.email || '')
    if (hasToken) rowData.push(r.token || '')

    rowData.push(overallStatus, progress)

    for (const c of checkpoints) {
      const cs = (r.checkpointStatus || []).find((s) => s.checkpointId === c.id || s.code === c.code)
      if (cs && cs.scan) {
        rowData.push(
          'Done',
          formatScanDateTime(cs.scan.scanned_at),
          cs.scan.method || 'scan',
          cs.scan.device_label || (cs.scan.method === 'manual' ? 'Manual Admin' : 'System')
        )
      } else {
        rowData.push('Pending', '', '', '')
      }
    }

    return rowData
  })

  return { headers, rows: exportRows }
}

export function prepareScansExportData(scans = [], participants = [], checkpoints = []) {
  const participantMap = new Map()
  for (const p of participants) {
    participantMap.set(p.id, p)
  }

  const checkpointMap = new Map()
  for (const c of checkpoints) {
    checkpointMap.set(c.id, c)
  }

  const headers = [
    'Scan ID',
    'Registration No',
    'Participant Name',
    'Checkpoint',
    'Checkpoint Code',
    'Scanned At',
    'Method',
    'Scanned By / Device',
  ]

  const exportRows = scans.map((s) => {
    const p = participantMap.get(s.participant_id)
    const c = checkpointMap.get(s.checkpoint_id)
    return [
      s.id,
      p?.reg_no || '',
      p?.name || '',
      c?.label || '',
      c?.code || '',
      formatScanDateTime(s.scanned_at),
      s.method || 'scan',
      s.device_label || (s.method === 'manual' ? 'Manual Admin' : 'System'),
    ]
  })

  return { headers, rows: exportRows }
}

export function prepareSummaryExportData(stats, checkpoints = []) {
  const headers = ['Metric', 'Count / Value']
  const rows = [
    ['Event Name', 'Swarajya Food Pass Admin'],
    ['Export Generated At', formatScanDateTime(new Date().toISOString())],
    ['Total Registered Participants', stats.total ?? 0],
    ['Fully Done (All Checkpoints)', stats.fullyDone ?? 0],
    ['Not Started / Not Entered', stats.notStarted ?? 0],
  ]

  for (const c of checkpoints) {
    rows.push([`Checkpoint: ${c.label} (${c.code})`, stats.perCheckpoint?.[c.code] ?? 0])
  }

  return { headers, rows }
}

export function prepareLogsExportData(logs = []) {
  const headers = [
    'Log ID',
    'Action',
    'Registration No',
    'Participant Name',
    'Checkpoint',
    'Reason / Note',
    'Timestamp',
  ]

  const rows = logs.map((log) => [
    log.id,
    log.action,
    log.participants?.reg_no || '',
    log.participants?.name || '',
    log.checkpoints?.label || log.checkpoints?.code || '',
    log.note || '',
    formatScanDateTime(log.created_at),
  ])

  return { headers, rows }
}

export function generateCsvString(headers, rows) {
  const escapeValue = (val) => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const allLines = [headers, ...rows].map((row) => row.map(escapeValue).join(','))
  return '\uFEFF' + allLines.join('\r\n')
}

export function downloadBlob(blob, filename) {
  if (typeof window === 'undefined') return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportToCsv(filename, headers, rows) {
  const csvString = generateCsvString(headers, rows)
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const finalFilename = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`
  downloadBlob(blob, finalFilename)
}

export async function exportToXlsx(filename, { participantsData, scansData, summaryData, logsData } = {}) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  if (participantsData) {
    const ws = XLSX.utils.aoa_to_sheet([participantsData.headers, ...participantsData.rows])
    ws['!cols'] = participantsData.headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...participantsData.rows.slice(0, 100).map((r) => String(r[i] ?? '').length)
      )
      return { wch: Math.min(Math.max(maxLen + 3, 12), 40) }
    })
    XLSX.utils.book_append_sheet(wb, ws, 'Participants')
  }

  if (scansData && scansData.rows.length > 0) {
    const ws = XLSX.utils.aoa_to_sheet([scansData.headers, ...scansData.rows])
    ws['!cols'] = scansData.headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...scansData.rows.slice(0, 100).map((r) => String(r[i] ?? '').length)
      )
      return { wch: Math.min(Math.max(maxLen + 3, 12), 40) }
    })
    XLSX.utils.book_append_sheet(wb, ws, 'Scans Log')
  }

  if (summaryData) {
    const ws = XLSX.utils.aoa_to_sheet([summaryData.headers, ...summaryData.rows])
    ws['!cols'] = [{ wch: 32 }, { wch: 24 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Summary')
  }

  if (logsData && logsData.rows.length > 0) {
    const ws = XLSX.utils.aoa_to_sheet([logsData.headers, ...logsData.rows])
    ws['!cols'] = logsData.headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...logsData.rows.slice(0, 100).map((r) => String(r[i] ?? '').length)
      )
      return { wch: Math.min(Math.max(maxLen + 3, 12), 40) }
    })
    XLSX.utils.book_append_sheet(wb, ws, 'Override Logs')
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const finalFilename = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`
  downloadBlob(blob, finalFilename)
}

export function getExportFilename(baseName, extension) {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const hours = String(now.getHours()).padStart(2, '0')
  const mins = String(now.getMinutes()).padStart(2, '0')
  return `${baseName}_${dateStr}_${hours}-${mins}.${extension}`
}
