import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover',
})

// Tiered lifetime deal pricing
export const LIFETIME_DEAL_TIERS = [
  { tier: 1, maxCount: 10, price: 2900, label: 'Founding Alpha', discount: '90% off' },  // $29 - First 10
  { tier: 2, maxCount: 20, price: 5900, label: 'Early Alpha', discount: '80% off' },     // $59 - Next 10
  { tier: 3, maxCount: 30, price: 8900, label: 'Alpha', discount: '70% off' },           // $89 - Next 10
  { tier: 4, maxCount: 40, price: 11900, label: 'Beta', discount: '60% off' },           // $119 - Next 10
  { tier: 5, maxCount: 50, price: 14900, label: 'Early Access', discount: '50% off' },   // $149 - Next 10
]

export const FULL_PRICE = 29900 // $299 full price
export const LIFETIME_DEAL_PRODUCT_NAME = 'ReddRide Lifetime Access'

// Legacy export for backwards compatibility
export const LIFETIME_DEAL_PRICE = 5900

export function getCurrentTierInfo(lifetimeDealsSold: number) {
  for (const tier of LIFETIME_DEAL_TIERS) {
    if (lifetimeDealsSold < tier.maxCount) {
      const spotsRemaining = tier.maxCount - lifetimeDealsSold
      return {
        ...tier,
        spotsRemaining,
        currentCount: lifetimeDealsSold,
        isSoldOut: false,
      }
    }
  }
  // All tiers sold out - return full price
  return {
    tier: 6,
    maxCount: Infinity,
    price: FULL_PRICE,
    label: 'Standard',
    discount: '0% off',
    spotsRemaining: Infinity,
    currentCount: lifetimeDealsSold,
    isSoldOut: true,
  }
}
