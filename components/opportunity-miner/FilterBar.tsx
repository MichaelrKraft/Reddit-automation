'use client'

type OpportunityCategory =
  | 'PAIN_POINT'
  | 'FEATURE_REQUEST'
  | 'CONTENT_OPPORTUNITY'
  | 'COMPETITOR_GAP'
  | 'TRENDING_TOPIC'

type OpportunityStatus = 'NEW' | 'TRACKING' | 'ACTED_ON' | 'ARCHIVED'

type SortOption = 'score' | 'recent' | 'evidence' | 'trending'

interface FilterBarProps {
  category: OpportunityCategory | ''
  status: OpportunityStatus | ''
  sortBy: SortOption
  search: string
  onCategoryChange: (category: OpportunityCategory | '') => void
  onStatusChange: (status: OpportunityStatus | '') => void
  onSortChange: (sort: SortOption) => void
  onSearchChange: (search: string) => void
  onScan: () => void
  isScanning: boolean
}

const categories: { value: OpportunityCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'PAIN_POINT', label: '🔥 Pain Points' },
  { value: 'FEATURE_REQUEST', label: '✨ Feature Requests' },
  { value: 'CONTENT_OPPORTUNITY', label: '📝 Content Gaps' },
  { value: 'COMPETITOR_GAP', label: '🎯 Competitor Gaps' },
  { value: 'TRENDING_TOPIC', label: '📈 Trending' },
]

const statuses: { value: OpportunityStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'NEW', label: 'New' },
  { value: 'TRACKING', label: 'Tracking' },
  { value: 'ACTED_ON', label: 'Acted On' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'score', label: 'Highest Score' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'evidence', label: 'Most Evidence' },
  { value: 'trending', label: 'Trending' },
]

export default function FilterBar({
  category,
  status,
  sortBy,
  search,
  onCategoryChange,
  onStatusChange,
  onSortChange,
  onSearchChange,
  onScan,
  isScanning,
}: FilterBarProps) {
  return (
    <div className="filter-bar rounded-xl p-4 mb-6">
      {/* Mobile: Stack vertically, Desktop: Horizontal */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search - Full width on mobile */}
        <div className="w-full sm:flex-1 sm:min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search opportunities..."
            className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-white placeholder-gray-500"
          />
        </div>

        {/* Filters row - Wraps on small screens */}
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) =>
              onCategoryChange(e.target.value as OpportunityCategory | '')
            }
            className="flex-1 sm:flex-none min-w-[120px] px-3 py-2 text-sm border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-[#00D9FF] text-white"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) =>
              onStatusChange(e.target.value as OpportunityStatus | '')
            }
            className="flex-1 sm:flex-none min-w-[100px] px-3 py-2 text-sm border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-[#00D9FF] text-white"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="flex-1 sm:flex-none min-w-[120px] px-3 py-2 text-sm border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-[#00D9FF] text-white"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Scan Button */}
          <button
            onClick={onScan}
            disabled={isScanning}
            className="w-full sm:w-auto bg-gradient-to-r from-[#00D9FF] to-cyan-500 text-black font-semibold px-4 sm:px-6 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isScanning ? (
              <>
                <span className="animate-spin">⟳</span>
                <span className="hidden sm:inline">Scanning...</span>
                <span className="sm:hidden">Scan</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span className="hidden sm:inline">Scan Now</span>
                <span className="sm:hidden">Scan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
