'use client'

import { useState, useCallback, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
}

let toastId = 0

export function useToast(): ToastContextValue {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return { toasts, showToast }
}

interface ToastContainerProps {
  toasts: Toast[]
}

export function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  const bgColor = {
    success: 'bg-green-500/20 border-green-500/50',
    error: 'bg-red-500/20 border-red-500/50',
    info: 'bg-[#00D9FF]/20 border-[#00D9FF]/50',
  }[toast.type]

  const textColor = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-[#00D9FF]',
  }[toast.type]

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }[toast.type]

  return (
    <div
      className={`
        ${bgColor} ${textColor}
        px-4 py-3 rounded-lg border backdrop-blur-sm
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        min-w-[280px] max-w-[400px]
        flex items-center gap-3
      `}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  )
}
