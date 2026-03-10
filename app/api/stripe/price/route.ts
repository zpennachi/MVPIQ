import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { isStripeConfigured } from '@/lib/env'

export const dynamic = 'force-dynamic'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = isStripeConfigured() && stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    })
  : null

export async function GET() {
  try {
    if (!stripe) {
      // In dev mode or without Stripe config, return a default price amount
      return NextResponse.json({ priceId: null, amount: 200, currency: 'usd' })
    }

    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID

    if (!priceId) {
      // If Stripe is configured but no price ID, return default
      return NextResponse.json({ priceId: null, amount: 200, currency: 'usd' })
    }

    const price = await stripe.prices.retrieve(priceId)
    
    return NextResponse.json({
      priceId: price.id,
      amount: price.unit_amount ? price.unit_amount / 100 : 200,
      currency: price.currency,
    })
  } catch (error) {
    console.error('Error fetching Stripe price:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price', amount: 200, currency: 'usd' },
      { status: 500 }
    )
  }
}
