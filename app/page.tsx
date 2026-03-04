import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScrollToAnchor } from '@/components/homepage/ScrollToAnchor'
import { DynamicHomepage } from '@/components/homepage/DynamicHomepage'
import { FooterLinks } from '@/components/homepage/FooterLinks'

export const dynamic = 'force-dynamic'

export default async function Home() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Only redirect if profile exists and no error
      if (profile && !error) {
        redirect('/dashboard')
      }
    }
  } catch (error) {
    // If there's an error, just continue and show the home page
    console.error('Error loading user:', error)
  }

  return (
    <div className="min-h-screen bg-black">
      <ScrollToAnchor />
      <DynamicHomepage />

      {/* Footer - Matching original mvp-iq.com */}
      <footer className="relative bg-black py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FooterLinks />
          <div className="mt-8 text-center">
            <p className="text-sm text-[#d9d9d9]">
              Developed by{' '}
              <a
                href="https://www.freelogicinc.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#ffc700] transition-colors duration-300"
              >
                Free Logic Inc.
              </a>{' '}
              All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
