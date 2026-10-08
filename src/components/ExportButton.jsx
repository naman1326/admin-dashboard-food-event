import { useState, useEffect, useRef } from 'react'
import {
  prepareParticipantsExportData,
  prepareScansExportData,
  prepareSummaryExportData,
  exportToCsv,
  exportToXlsx,
  getExportFilename,
} from '../exportUtils.js'

export default function ExportButton({
  allRows = [],
  filteredRows = [],
  checkpoints = [],
  scans = [],
  stats,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [exportStatus, setExportStatus] = useState(null) // null | 'Exporting…' | 'Exported!'
  const containerRef = useRef(null)

  const isFiltered = filteredRows.length > 0 && filteredRows.length !== allRows.length

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('click', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('click', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function showSuccess() {
    setExportStatus('Exported!')
    setTimeout(() => {
      setExportStatus(null)
    }, 2000)
  }

  async function handleExportAllXlsx() {
    try {
      setExportStatus('Exporting…')
      const participantsData = prepareParticipantsExportData(allRows, checkpoints)
      const scansData = prepareScansExportData(scans, allRows, checkpoints)
      const summaryData = stats ? prepareSummaryExportData(stats, checkpoints) : null
      const filename = getExportFilename('swarajya_food_pass_all_data', 'xlsx')

      await exportToXlsx(filename, {
        participantsData,
        scansData,
        summaryData,
      })
      setIsOpen(false)
      showSuccess()
    } catch (err) {
      console.error('Failed to export all XLSX:', err)
      setExportStatus('Export failed')
      setTimeout(() => setExportStatus(null), 2500)
    }
  }

  function handleExportAllCsv() {
    try {
      setExportStatus('Exporting…')
      const participantsData = prepareParticipantsExportData(allRows, checkpoints)
      const filename = getExportFilename('swarajya_food_pass_all_participants', 'csv')

      exportToCsv(filename, participantsData.headers, participantsData.rows)
      setIsOpen(false)
      showSuccess()
    } catch (err) {
      console.error('Failed to export all CSV:', err)
      setExportStatus('Export failed')
      setTimeout(() => setExportStatus(null), 2500)
    }
  }

  async function handleExportFilteredXlsx() {
    try {
      setExportStatus('Exporting…')
      const participantsData = prepareParticipantsExportData(filteredRows, checkpoints)
      const filename = getExportFilename('swarajya_food_pass_filtered', 'xlsx')

      await exportToXlsx(filename, {
        participantsData,
      })
      setIsOpen(false)
      showSuccess()
    } catch (err) {
      console.error('Failed to export filtered XLSX:', err)
      setExportStatus('Export failed')
      setTimeout(() => setExportStatus(null), 2500)
    }
  }

  function handleExportFilteredCsv() {
    try {
      setExportStatus('Exporting…')
      const participantsData = prepareParticipantsExportData(filteredRows, checkpoints)
      const filename = getExportFilename('swarajya_food_pass_filtered', 'csv')

      exportToCsv(filename, participantsData.headers, participantsData.rows)
      setIsOpen(false)
      showSuccess()
    } catch (err) {
      console.error('Failed to export filtered CSV:', err)
      setExportStatus('Export failed')
      setTimeout(() => setExportStatus(null), 2500)
    }
  }

  function handleExportScansCsv() {
    try {
      setExportStatus('Exporting…')
      const scansData = prepareScansExportData(scans, allRows, checkpoints)
      const filename = getExportFilename('swarajya_food_pass_scans_log', 'csv')

      exportToCsv(filename, scansData.headers, scansData.rows)
      setIsOpen(false)
      showSuccess()
    } catch (err) {
      console.error('Failed to export scans CSV:', err)
      setExportStatus('Export failed')
      setTimeout(() => setExportStatus(null), 2500)
    }
  }

  return (
    <div className="export-btn-container" ref={containerRef}>
      <button
        type="button"
        className={`refresh-button export-btn ${isOpen ? 'is-active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled || allRows.length === 0}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Export data as Excel or CSV"
      >
        <svg
          className="export-btn-icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>{exportStatus || 'Export'}</span>
        <svg
          className={`export-caret ${isOpen ? 'is-open' : ''}`}
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="export-menu-dropdown" role="menu">
          <div className="export-menu-section-header">
            All Data ({allRows.length} participants)
          </div>

          <button
            type="button"
            className="export-menu-item"
            role="menuitem"
            onClick={handleExportAllXlsx}
          >
            <span className="export-item-badge xlsx-badge">XLSX</span>
            <div className="export-item-text">
              <span className="export-item-title">Excel Workbook (.xlsx)</span>
              <span className="export-item-desc">Full workbook (participants, scans & summary)</span>
            </div>
          </button>

          <button
            type="button"
            className="export-menu-item"
            role="menuitem"
            onClick={handleExportAllCsv}
          >
            <span className="export-item-badge csv-badge">CSV</span>
            <div className="export-item-text">
              <span className="export-item-title">CSV Spreadsheet (.csv)</span>
              <span className="export-item-desc">All participants with checkpoint status</span>
            </div>
          </button>

          {isFiltered && (
            <>
              <div className="export-menu-divider" />
              <div className="export-menu-section-header">
                Filtered Data ({filteredRows.length} shown)
              </div>

              <button
                type="button"
                className="export-menu-item"
                role="menuitem"
                onClick={handleExportFilteredXlsx}
              >
                <span className="export-item-badge xlsx-badge">XLSX</span>
                <div className="export-item-text">
                  <span className="export-item-title">Filtered Excel (.xlsx)</span>
                  <span className="export-item-desc">Export current {filteredRows.length} matching rows</span>
                </div>
              </button>

              <button
                type="button"
                className="export-menu-item"
                role="menuitem"
                onClick={handleExportFilteredCsv}
              >
                <span className="export-item-badge csv-badge">CSV</span>
                <div className="export-item-text">
                  <span className="export-item-title">Filtered CSV (.csv)</span>
                  <span className="export-item-desc">Export current {filteredRows.length} matching rows</span>
                </div>
              </button>
            </>
          )}

          <div className="export-menu-divider" />
          <div className="export-menu-section-header">Detailed Scans</div>

          <button
            type="button"
            className="export-menu-item"
            role="menuitem"
            onClick={handleExportScansCsv}
          >
            <span className="export-item-badge scan-badge">LOG</span>
            <div className="export-item-text">
              <span className="export-item-title">Raw Scans Log (.csv)</span>
              <span className="export-item-desc">All {scans.length} scan timestamps & devices</span>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
