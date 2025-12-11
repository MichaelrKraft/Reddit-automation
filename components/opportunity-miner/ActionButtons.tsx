'use client'

import { useState } from 'react'

type OpportunityStatus = 'NEW' | 'TRACKING' | 'ACTED_ON' | 'ARCHIVED'

interface ActionButtonsProps {
  opportunityId: string
  currentStatus: OpportunityStatus
  onStatusChange?: (newStatus: OpportunityStatus) => void
  onExport?: () => void
  className?: string
}

export default function ActionButtons({
  opportunityId,
  currentStatus,
  onStatusChange,
  onExport,
  className = '',
}: ActionButtonsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const recordAction = async (
    actionType: string,
    newStatus?: OpportunityStatus
  ) => {
    setIsLoading(actionType)
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType,
          metadata: { triggeredAt: new Date().toISOString() },
        }),
      })

      if (response.ok && newStatus && onStatusChange) {
        onStatusChange(newStatus)
      }
    } catch (error) {
      console.error('Failed to record action:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const handleExport = async () => {
    setIsLoading('EXPORTED')
    try {
      const response = await fetch(
        `/api/opportunities/export?ids=${opportunityId}&format=json`
      )
      const data = await response.json()

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `opportunity-${opportunityId}.json`
      a.click()
      URL.revokeObjectURL(url)

      if (onExport) onExport()
    } catch (error) {
      console.error('Failed to export:', error)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Track Button */}
      {currentStatus !== 'TRACKING' && currentStatus !== 'ACTED_ON' && (
        <button
          onClick={() => recordAction('TRACKED', 'TRACKING')}
          disabled={isLoading !== null}
          className="action-btn action-btn-track"
        >
          {isLoading === 'TRACKED' ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <>
              <span>👁️</span>
              Track
            </>
          )}
        </button>
      )}

      {/* Mark as Acted On */}
      {currentStatus !== 'ACTED_ON' && (
        <button
          onClick={() => recordAction('CONTENT_CREATED', 'ACTED_ON')}
          disabled={isLoading !== null}
          className="action-btn action-btn-act"
        >
          {isLoading === 'CONTENT_CREATED' ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <>
              <span>✅</span>
              Mark Done
            </>
          )}
        </button>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isLoading !== null}
        className="action-btn action-btn-export"
      >
        {isLoading === 'EXPORTED' ? (
          <span className="animate-spin">⟳</span>
        ) : (
          <>
            <span>📥</span>
            Export
          </>
        )}
      </button>

      {/* Archive Button */}
      {currentStatus !== 'ARCHIVED' && (
        <button
          onClick={() => recordAction('ARCHIVED', 'ARCHIVED')}
          disabled={isLoading !== null}
          className="action-btn action-btn-archive"
        >
          {isLoading === 'ARCHIVED' ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <>
              <span>📦</span>
              Archive
            </>
          )}
        </button>
      )}

      <style jsx>{`
        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .action-btn-track {
          background: rgba(0, 217, 255, 0.15);
          color: #00D9FF;
          border-color: rgba(0, 217, 255, 0.3);
        }
        .action-btn-track:hover:not(:disabled) {
          background: rgba(0, 217, 255, 0.25);
          border-color: rgba(0, 217, 255, 0.5);
        }
        .action-btn-act {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          border-color: rgba(34, 197, 94, 0.3);
        }
        .action-btn-act:hover:not(:disabled) {
          background: rgba(34, 197, 94, 0.25);
          border-color: rgba(34, 197, 94, 0.5);
        }
        .action-btn-export {
          background: rgba(168, 85, 247, 0.15);
          color: #a855f7;
          border-color: rgba(168, 85, 247, 0.3);
        }
        .action-btn-export:hover:not(:disabled) {
          background: rgba(168, 85, 247, 0.25);
          border-color: rgba(168, 85, 247, 0.5);
        }
        .action-btn-archive {
          background: rgba(107, 114, 128, 0.15);
          color: #9ca3af;
          border-color: rgba(107, 114, 128, 0.3);
        }
        .action-btn-archive:hover:not(:disabled) {
          background: rgba(107, 114, 128, 0.25);
          border-color: rgba(107, 114, 128, 0.5);
        }
      `}</style>
    </div>
  )
}
