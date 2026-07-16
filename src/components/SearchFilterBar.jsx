import { FILTERS } from '../dashboardLogic.js'

const FILTER_OPTIONS = [
  { value: FILTERS.ALL, label: 'All' },
  { value: FILTERS.NOT_ENTERED, label: 'Not entered' },
  { value: FILTERS.ENTERED_NO_FOOD, label: 'Entered, no food yet' },
  { value: FILTERS.FULLY_DONE, label: 'Fully done' },
]

export default function SearchFilterBar({ query, onQuery, filter, onFilter, resultCount }) {
  return (
    <div className="search-filter-bar">
      <input
        type="text"
        className="search-input"
        placeholder="Search by name or reg. no."
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <div className="filter-chips">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`filter-chip ${filter === opt.value ? 'is-active' : ''}`}
            onClick={() => onFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <span className="result-count">{resultCount} shown</span>
    </div>
  )
}
