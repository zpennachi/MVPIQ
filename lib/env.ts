/**
 * Environment variable validation and access
 * Ensures all required env vars are present and typed
 */

import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  
  // Stripe (optional for dev mode)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  
  // Resend (optional)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional().default('onboarding@resend.dev'),
  
  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Cron (optional)
  CRON_SECRET: z.string().optional().default('your-secret-key'),
  
  // Google Calendar API (optional - for real Meet links)
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().optional().default('primary'),
})

type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

// Lazy validation - only validate when env is first accessed
// This allows the build to complete even if env vars aren't set
function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv
  }

  try {
    cachedEnv = envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      CRON_SECRET: process.env.CRON_SECRET,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
    })
    return cachedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')
      const errorMessage = `❌ Invalid environment variables:\n${missingVars}\n\n` +
        'Please check your .env file and ensure all required variables are set.'
      
      // During build, use fallbacks to allow build to complete
      // Runtime will fail when env is actually used
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn('⚠️ Build phase: Using fallback env values. Set env vars in Vercel for runtime.')
        cachedEnv = {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key',
          STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
          STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
          RESEND_API_KEY: process.env.RESEND_API_KEY,
          RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          CRON_SECRET: process.env.CRON_SECRET || 'your-secret-key',
          GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
          GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || 'primary',
        } as Env
        return cachedEnv
      }
      
      // At runtime, throw the error
      throw new Error(errorMessage)
    } else {
      throw error
    }
  }
}

// Export a proxy object that validates on access
export const env = new Proxy({} as Env, {
  get(_target, prop: keyof Env) {
    const validatedEnv = getEnv()
    return validatedEnv[prop]
  }
})

// Helper to check if Stripe is configured
export const isStripeConfigured = (): boolean => {
  const validatedEnv = getEnv()
  return !!validatedEnv.STRIPE_SECRET_KEY && !!validatedEnv.STRIPE_WEBHOOK_SECRET
}

// Helper to check if Resend is configured
export const isResendConfigured = (): boolean => {
  const validatedEnv = getEnv()
  return !!validatedEnv.RESEND_API_KEY
}
