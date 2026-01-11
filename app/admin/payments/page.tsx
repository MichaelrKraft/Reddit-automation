'use client'

import { useEffect, useState } from 'react'
import {
  CreditCard,
  DollarSign,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  TrendingUp,
  Gift
} from 'lucide-react'

interface Payment {
  id: string
  amount: number
  amountFormatted: string
  currency: string
  status: string
  paid: boolean
  refunded: boolean
  customerEmail: string
  customerName: string
  description: string
  created: string
  receiptUrl: string | null
  last4: string | null
  brand: string | null
}

interface PaymentsSummary {
  totalPayments: number
  successfulPayments: number
  totalRevenue: number
  totalRevenueFormatted: string
  refundedAmount: number
  refundedAmountFormatted: string
}

interface MrrTrendItem {
  month: string
  revenue: number
  revenueFormatted: string
  count: number
}

interface LtdTier {
  tier: number
  label: string
  price: number
  priceFormatted: string
  sold: number
  max: number
  isCurrent: boolean
  isSoldOut: boolean
}

interface LtdProgress {
  totalSold: number
  currentTier: number
  currentTierLabel: string
  currentPrice: number
  currentPriceFormatted: string
  spotsRemaining: number
  tiers: LtdTier[]
}

interface PaymentsResponse {
  payments: Payment[]
  summary: PaymentsSummary
  revenue?: {
    mrrTrend: MrrTrendItem[]
    ltdProgress: LtdProgress
  }
  hasMore: boolean
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<PaymentsSummary | null>(null)
  const [mrrTrend, setMrrTrend] = useState<MrrTrendItem[]>([])
  const [ltdProgress, setLtdProgress] = useState<LtdProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments()
  }, [])

  async function fetchPayments() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/payments')
      if (!response.ok) throw new Error('Failed to fetch payments')

      const data: PaymentsResponse = await response.json()
      setPayments(data.payments)
      setSummary(data.summary)
      if (data.revenue) {
        setMrrTrend(data.revenue.mrrTrend)
        setLtdProgress(data.revenue.ltdProgress)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getCardBrandIcon(brand: string | null) {
    const brandLower = brand?.toLowerCase()
    if (brandLower === 'visa') return '💳 Visa'
    if (brandLower === 'mastercard') return '💳 MC'
    if (brandLower === 'amex') return '💳 Amex'
    return '💳'
  }

  const maxRevenue = Math.max(...mrrTrend.map(m => m.revenue), 1)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-gray-400 text-sm">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : summary?.totalRevenueFormatted || '$0.00'}
          </p>
        </div>

        <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-gray-400 text-sm">Successful Payments</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : summary?.successfulPayments || 0}
          </p>
        </div>

        <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Gift className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-gray-400 text-sm">Lifetime Deals Sold</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : ltdProgress?.totalSold || 0}
          </p>
          <p className="text-purple-400 text-sm mt-1">
            {loading ? '' : ltdProgress ? `${ltdProgress.currentTierLabel} @ ${ltdProgress.currentPriceFormatted}` : ''}
          </p>
        </div>

        <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <RefreshCw className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-gray-400 text-sm">Refunded</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : summary?.refundedAmountFormatted || '$0.00'}
          </p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      {mrrTrend.length > 0 && (
        <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-white">12-Month Revenue Trend</h2>
          </div>

          <div className="flex items-end gap-2 h-48">
            {mrrTrend.map((month, i) => {
              const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0
              return (
                <div key={i} className="flex-1 group relative flex flex-col items-center">
                  <div
                    className="w-full bg-green-500 rounded-t transition-all hover:bg-green-400"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 rounded text-xs text-white opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                    {month.month}: {month.revenueFormatted} ({month.count} sales)
                  </div>
                  <span className="text-[10px] text-gray-500 mt-2 truncate w-full text-center">
                    {month.month.split(' ')[0]}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Lifetime Deal Tier Progress */}
      {ltdProgress && (
        <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-white">Lifetime Deal Tiers</h2>
            </div>
            <div className="text-right">
              <p className="text-purple-400 font-medium">
                {ltdProgress.spotsRemaining === Infinity ? 'Unlimited' : `${ltdProgress.spotsRemaining} spots remaining`}
              </p>
              <p className="text-gray-500 text-sm">Current: {ltdProgress.currentTierLabel}</p>
            </div>
          </div>

          <div className="space-y-4">
            {ltdProgress.tiers.map((tier) => (
              <div key={tier.tier} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      tier.isCurrent
                        ? 'bg-purple-500/20 text-purple-400'
                        : tier.isSoldOut
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      Tier {tier.tier}
                    </span>
                    <span className="text-white font-medium">{tier.label}</span>
                    <span className="text-gray-400 text-sm">{tier.priceFormatted}</span>
                  </div>
                  <div className="text-right">
                    <span className={tier.isSoldOut ? 'text-green-400' : 'text-gray-400'}>
                      {tier.sold}/{tier.max}
                    </span>
                    {tier.isSoldOut && <span className="text-green-400 text-xs ml-2">SOLD OUT</span>}
                    {tier.isCurrent && <span className="text-purple-400 text-xs ml-2">ACTIVE</span>}
                  </div>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      tier.isSoldOut ? 'bg-green-500' : tier.isCurrent ? 'bg-purple-500' : 'bg-gray-600'
                    }`}
                    style={{ width: `${(tier.sold / tier.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchPayments}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-sm"
          >
            Retry
          </button>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-[#111118] rounded-xl border border-gray-800 p-12 text-center">
          <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No payments yet</p>
          <p className="text-gray-500 text-sm mt-1">Payments will appear here once customers purchase</p>
        </div>
      ) : (
        <div className="bg-[#111118] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="text-white font-medium">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Customer</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Amount</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Card</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{payment.customerEmail}</p>
                        {payment.customerName !== 'N/A' && (
                          <p className="text-gray-500 text-xs">{payment.customerName}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{payment.amountFormatted}</span>
                      <span className="text-gray-500 text-xs ml-1">{payment.currency}</span>
                    </td>
                    <td className="px-4 py-3">
                      {payment.refunded ? (
                        <span className="flex items-center gap-1 text-red-400 text-sm">
                          <XCircle className="w-4 h-4" />
                          Refunded
                        </span>
                      ) : payment.paid ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Paid
                        </span>
                      ) : (
                        <span className="text-yellow-400 text-sm">{payment.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {payment.last4 ? (
                        <span>
                          {getCardBrandIcon(payment.brand)} •••• {payment.last4}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {formatDate(payment.created)}
                    </td>
                    <td className="px-4 py-3">
                      {payment.receiptUrl ? (
                        <a
                          href={payment.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-orange-400 hover:text-orange-300 text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View
                        </a>
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
