import Link from 'next/link'
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
      
      {/* Footer - Always show */}
      <footer className="relative bg-black border-t border-[#272727] text-[#d9d9d9] py-12 dotted-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-8">
            <FooterLinks />
          </div>
          <div className="border-t border-[#272727] pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-center sm:text-left text-white">Developed by Free Logic Inc. All rights reserved</p>
              <Link
                href="/contact"
                className="text-[#ffc700] hover:text-[#e6b300] text-sm font-medium transition-all duration-300 uppercase tracking-wide"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
