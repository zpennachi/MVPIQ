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
  
  // Gmail (uses OAuth, no separate API key needed)
  // GMAIL_FROM_EMAIL is hardcoded to mvpiqweb@gmail.com in lib/gmail.ts
  
  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Cron (optional)
  CRON_SECRET: z.string().optional().default('your-secret-key'),
  
  // Google OAuth (required for calendar integration and Meet links)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
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
      // Gmail uses OAuth, no env vars needed
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      CRON_SECRET: process.env.CRON_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
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
      // Gmail uses OAuth, no env vars needed
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          CRON_SECRET: process.env.CRON_SECRET || 'your-secret-key',
          GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
          GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
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

// Gmail uses OAuth, no configuration check needed
// OAuth connection is checked at runtime in lib/gmail.ts
