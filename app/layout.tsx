import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Montserrat } from 'next/font/google'
import './globals.css'
import AlphaFeedbackWidget from '@/components/AlphaFeedbackWidget'
import AnalyticsProvider from '@/components/AnalyticsProvider'
import GoogleAnalytics from '@/components/GoogleAnalytics'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RedRide - AI-Powered Reddit Marketing Automation',
  description: 'Get upvotes, not shadowbans. AI-powered Reddit marketing that creates viral content, not just schedules it. Free for first 20 alpha users.',
  keywords: ['Reddit automation', 'Reddit marketing', 'AI content', 'viral marketing', 'social media automation'],
  authors: [{ name: 'RedRide' }],
  creator: 'RedRide',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://reddride.com',
    siteName: 'RedRide',
    title: 'RedRide - AI-Powered Reddit Marketing Automation',
    description: 'Get upvotes, not shadowbans. AI-powered Reddit marketing that creates viral content, not just schedules it.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RedRide - Reddit Marketing Automation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RedRide - AI-Powered Reddit Marketing',
    description: 'Get upvotes, not shadowbans. AI-powered Reddit marketing that creates viral content.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/logo-icon.svg',
    shortcut: '/logo-icon.svg',
    apple: '/logo-icon.svg',
  },
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
      <html lang="en" className={montserrat.variable}>
        <body>
          <GoogleAnalytics />
          <AnalyticsProvider>
            {children}
            <AlphaFeedbackWidget />
          </AnalyticsProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
