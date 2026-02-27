'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black dotted-bg px-4 py-8">
      <div className="max-w-md w-full bg-black border border-[#272727] rounded-lg shadow-mvp p-6 sm:p-8 relative z-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-[#d9d9d9]">Reset Password</h1>
        
        {error && (
          <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-800 text-green-400 px-4 py-3 rounded">
              <p className="font-medium">Check your email!</p>
              <p className="text-sm mt-1">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full text-center bg-[#ffc700] text-black py-2.5 rounded-md hover:bg-[#e6b300] transition font-medium touch-manipulation"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#d9d9d9] mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#d9d9d9] mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ffc700] text-black py-2.5 rounded-md hover:bg-[#e6b300] disabled:opacity-50 disabled:cursor-not-allowed transition font-medium touch-manipulation"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-[#d9d9d9]">
              Remember your password?{' '}
              <Link href="/login" className="text-[#ffc700] hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
