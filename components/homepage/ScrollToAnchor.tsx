'use client'

import { useEffect } from 'react'

export function ScrollToAnchor() {
  useEffect(() => {
    // Check for hash in URL after page loads
    const handleHash = () => {
      const hash = window.location.hash
      if (hash) {
        const anchor = hash.substring(1) // Remove the #
        setTimeout(() => {
          const element = document.getElementById(anchor)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 300) // Wait for page to fully render
      }
    }

    // Run on mount
    handleHash()

    // Also listen for hash changes
    window.addEventListener('hashchange', handleHash)
    
    return () => {
      window.removeEventListener('hashchange', handleHash)
    }
  }, [])

  return null
}
