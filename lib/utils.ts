/**
 * Utility functions
 */

import type { Profile } from '@/types/database'

/**
 * Partial profile type for utility functions - only requires fields we actually use
 */
type PartialProfile = {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

/**
 * Get full name from profile (first_name + last_name)
 * Falls back to email if no name is available
 * Accepts full Profile or partial profile with just name/email fields
 */
export function getFullName(profile: Profile | PartialProfile | null | undefined): string {
  if (!profile) return ''
  
  const firstName = profile.first_name?.trim() || ''
  const lastName = profile.last_name?.trim() || ''
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  } else if (firstName) {
    return firstName
  } else if (lastName) {
    return lastName
  }
  
  return profile.email || ''
}

/**
 * Get first name from profile
 * Accepts full Profile or partial profile with just name/email fields
 */
export function getFirstName(profile: Profile | PartialProfile | null | undefined): string {
  if (!profile) return ''
  return profile.first_name?.trim() || profile.email?.split('@')[0] || ''
}

/**
 * Get initials from profile (first letter of first name + first letter of last name)
 * Accepts full Profile or partial profile with just name/email fields
 */
export function getInitials(profile: Profile | PartialProfile | null | undefined): string {
  if (!profile) return 'U'
  
  const firstName = profile.first_name?.trim() || ''
  const lastName = profile.last_name?.trim() || ''
  
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  } else if (firstName) {
    return firstName[0].toUpperCase()
  } else if (lastName) {
    return lastName[0].toUpperCase()
  }
  
  // Fallback to email
  const email = profile.email || ''
  return email[0]?.toUpperCase() || 'U'
}
