'use client'

interface ScoreGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export default function ScoreGauge({ score, size = 'md' }: ScoreGaugeProps) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-20 h-20 text-2xl',
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 border-green-400'
    if (score >= 60) return 'text-yellow-400 border-yellow-400'
    if (score >= 40) return 'text-orange-400 border-orange-400'
    return 'text-red-400 border-red-400'
  }

  const getBackgroundGradient = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-green-600/5'
    if (score >= 60) return 'from-yellow-500/20 to-yellow-600/5'
    if (score >= 40) return 'from-orange-500/20 to-orange-600/5'
    return 'from-red-500/20 to-red-600/5'
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full border-2 flex items-center justify-center font-bold bg-gradient-to-br ${getBackgroundGradient(score)} ${getScoreColor(score)}`}
    >
      {score}
    </div>
  )
}
