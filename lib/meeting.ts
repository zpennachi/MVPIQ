/**
 * Meeting link generation utilities
 * 
 * Generates unique meeting links for sessions.
 * Supports Google Meet (simple) or custom meeting pages.
 */

/**
 * Generate a unique meeting link for a session
 * 
 * @param sessionId - The booked session ID
 * @param type - Type of meeting link ('google-meet' | 'custom')
 * @returns A unique meeting link
 */
export function generateMeetingLink(
  sessionId: string,
  type: 'google-meet' | 'custom' = 'google-meet'
): string {
  // Create a short, unique identifier from the session ID
  // Use first 8 chars of UUID + timestamp for uniqueness
  const shortId = sessionId.substring(0, 8).replace(/-/g, '')
  const timestamp = Date.now().toString(36)
  const uniqueCode = `${shortId}-${timestamp}`.toLowerCase()

  if (type === 'google-meet') {
    // Google Meet: Generate a simple link that opens Google Meet
    // Users can create a new meeting or join an existing one
    // Format: https://meet.google.com/new (opens new meeting)
    // Alternative: Use a custom meeting page that embeds Google Meet
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'
    return `${baseUrl}/meeting/${uniqueCode}?provider=google-meet`
  } else {
    // Custom meeting page on your domain
    // You can create a page at /meeting/[id] that shows meeting details
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'
    return `${baseUrl}/meeting/${uniqueCode}`
  }
}

/**
 * Generate a more user-friendly meeting code
 * Format: abc-defg-hij (similar to Google Meet)
 */
export function generateMeetingCode(sessionId: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const shortId = sessionId.substring(0, 8).replace(/-/g, '')
  
  // Convert hex to a more readable format
  let code = ''
  for (let i = 0; i < shortId.length; i += 2) {
    const hex = shortId.substring(i, i + 2)
    const num = parseInt(hex, 16)
    code += chars[num % chars.length]
  }
  
  // Format as abc-defg-hij
  return `${code.substring(0, 3)}-${code.substring(3, 7)}-${code.substring(7, 10)}`
}
