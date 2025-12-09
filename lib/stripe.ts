import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover',
})

export const LIFETIME_DEAL_PRICE = 2900 // $29.00 in cents
export const LIFETIME_DEAL_PRODUCT_NAME = 'ReddRide Lifetime Access'
