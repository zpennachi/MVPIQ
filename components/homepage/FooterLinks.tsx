'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

export function FooterLinks() {
  const router = useRouter()
  const pathname = usePathname()

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, anchor: string) => {
    e.preventDefault()
    if (pathname !== '/') {
      router.push(`/#${anchor}`)
      // Wait for navigation, then scroll
      setTimeout(() => {
        const element = document.getElementById(anchor)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } else {
      const element = document.getElementById(anchor)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <>
      <div>
        <a
          href="#pros"
          onClick={(e) => handleAnchorClick(e, 'pros')}
          className="font-bold text-white mb-4 uppercase tracking-wide hover:text-[#ffc700] transition-all duration-300 cursor-pointer block"
        >
          Pros
        </a>
      </div>
      <div>
        <a
          href="#platform"
          onClick={(e) => handleAnchorClick(e, 'platform')}
          className="font-bold text-white mb-4 uppercase tracking-wide hover:text-[#ffc700] transition-all duration-300 cursor-pointer block"
        >
          Platform
        </a>
      </div>
      <div>
        <Link
          href="/login"
          className="font-bold text-white mb-4 uppercase tracking-wide hover:text-[#ffc700] transition-all duration-300 cursor-pointer block"
        >
          Log In
        </Link>
      </div>
      <div>
        <Link
          href="/register"
          className="font-bold text-white mb-4 uppercase tracking-wide hover:text-[#ffc700] transition-all duration-300 cursor-pointer block"
        >
          Sign Up
        </Link>
      </div>
    </>
  )
}
