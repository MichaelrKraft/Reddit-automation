import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Red Rider - Reddit Marketing Automation',
  description: 'AI-powered Reddit marketing automation for solo marketers',
}

if (typeof window === 'undefined') {
  import('@/lib/worker')
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
