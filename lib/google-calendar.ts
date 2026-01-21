/**
 * Google Calendar Integration Utilities
 * 
 * Uses OAuth authentication to generate Google Meet links for sessions.
 * Requires an admin user to connect their Google Calendar via OAuth.
 */

import { google } from 'googleapis'
import { env } from './env'
import { logger } from './logger'
import { createClient } from '@/lib/supabase/server'

export interface CalendarEventData {
  summary: string
  description?: string
  startTime: Date
  endTime: Date
  mentorEmail: string
  userEmail: string
  mentorName: string
  userName: string
  mentorId?: string // Optional: if provided, use this mentor's OAuth tokens
}

export interface CalendarEventResult {
  eventId: string
  meetLink: string
}

/**
 * Get OAuth client for a specific user (mentor or admin)
 * Returns null if no OAuth tokens are available
 */
async function getOAuthClient(userId?: string): Promise<{ client: any; calendarId: string } | null> {
  try {
    const supabase = await createClient()
    
    let profileQuery = supabase
      .from('profiles')
      .select('id, email, google_calendar_connected, google_calendar_id, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expires_at')
    
    // If userId provided, get that specific user's tokens (for mentors)
    if (userId) {
      const { data: profile, error: profileError } = await profileQuery
        .eq('id', userId)
        .single()
      
      if (profileError || !profile) {
        logger.warn('User profile not found for OAuth', { 
          userId,
          error: profileError?.message || 'Profile not found',
        })
        return null
      }
      
      if (!profile.google_calendar_access_token || !profile.google_calendar_refresh_token) {
        logger.warn('OAuth tokens missing for user', {
          userId,
          email: profile.email,
          hasAccessToken: !!profile.google_calendar_access_token,
          hasRefreshToken: !!profile.google_calendar_refresh_token,
        })
        return null
      }
      
      // Use this user's tokens
      const userProfile = profile
      
      // Check if token is expired and refresh if needed
      let accessToken = userProfile.google_calendar_access_token
      const expiresAt = userProfile.google_calendar_token_expires_at
      const now = new Date()
      
      // Only refresh if token is actually expired (with 5 minute buffer)
      const expirationBuffer = 5 * 60 * 1000 // 5 minutes
      const isExpired = expiresAt && new Date(expiresAt).getTime() <= (now.getTime() + expirationBuffer)
      
      if (isExpired) {
        // Token expired, refresh it
        logger.info('OAuth token expired, refreshing...', {
          expiresAt,
          now: now.toISOString(),
          userId: userProfile.id,
        })
        
        if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
          logger.warn('Cannot refresh OAuth token - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set')
          logger.warn('Will attempt to use expired token - Google API may refresh automatically')
        } else {
          try {
            const oauth2Client = new google.auth.OAuth2(
              env.GOOGLE_CLIENT_ID,
              env.GOOGLE_CLIENT_SECRET,
              '' // Redirect URI not needed for refresh
            )

            oauth2Client.setCredentials({
              refresh_token: userProfile.google_calendar_refresh_token,
            })

            const { credentials } = await oauth2Client.refreshAccessToken()
            
            if (!credentials.access_token) {
              logger.error('Failed to refresh OAuth token - no access_token in response', {
                hasRefreshToken: !!credentials.refresh_token,
                hasIdToken: !!credentials.id_token,
              })
              logger.warn('Will attempt to use existing token - Google API may refresh automatically')
            } else {
              accessToken = credentials.access_token

              // Update token in database
              const newExpiresAt = credentials.expiry_date 
                ? new Date(credentials.expiry_date).toISOString()
                : new Date(Date.now() + 3600 * 1000).toISOString()

              const updateData: any = {
                google_calendar_access_token: accessToken,
                google_calendar_token_expires_at: newExpiresAt,
              }
              
              if (credentials.refresh_token && credentials.refresh_token !== userProfile.google_calendar_refresh_token) {
                logger.info('Google provided new refresh token, updating it', {
                  userId: userProfile.id,
                })
                updateData.google_calendar_refresh_token = credentials.refresh_token
              }
              
              const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', userProfile.id)

              if (updateError) {
                logger.error('❌ Failed to update OAuth token in database', updateError, {
                  userId: userProfile.id,
                })
              } else {
                logger.info('✅ OAuth token refreshed and saved successfully', {
                  userId: userProfile.id,
                  newExpiresAt,
                })
              }
            }
          } catch (refreshError: any) {
            logger.error('Exception during OAuth token refresh', refreshError, {
              userId: userProfile.id,
              errorMessage: refreshError?.message,
              errorCode: refreshError?.code,
            })
            logger.warn('Will attempt to use existing token despite refresh error - Google API may refresh automatically')
          }
        }
      } else {
        logger.info('OAuth token is still valid', {
          expiresAt,
          now: now.toISOString(),
          timeUntilExpiry: expiresAt ? `${Math.round((new Date(expiresAt).getTime() - now.getTime()) / 1000 / 60)} minutes` : 'unknown',
        })
      }

      // Create OAuth client
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        return null
      }

      const oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        ''
      )

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: userProfile.google_calendar_refresh_token,
      })

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      const calendarId = userProfile.google_calendar_id || 'primary'

      return { client: calendar, calendarId }
    }
    
    // Fallback: Find admin user with OAuth tokens (for backward compatibility)
    const { data: adminProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, google_calendar_connected, google_calendar_id, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expires_at')
      .eq('role', 'admin')
    
    if (profileError) {
      logger.warn('Error fetching admin profiles', { 
        error: profileError.message || 'Unknown error',
        code: profileError.code,
      })
      return null
    }

    const adminProfile = adminProfiles?.find(p => 
      p.google_calendar_access_token && 
      p.google_calendar_refresh_token
    ) || null

    if (!adminProfile) {
      logger.warn('No admin profile with OAuth tokens found', {
        totalAdmins: adminProfiles?.length || 0,
        adminsWithTokens: adminProfiles?.filter(p => p.google_calendar_access_token && p.google_calendar_refresh_token).length || 0,
      })
      return null
    }

    if (!adminProfile.google_calendar_access_token || !adminProfile.google_calendar_refresh_token) {
      logger.warn('OAuth tokens missing in admin profile', {
        adminId: adminProfile.id,
        hasAccessToken: !!adminProfile.google_calendar_access_token,
        hasRefreshToken: !!adminProfile.google_calendar_refresh_token,
        isConnected: adminProfile.google_calendar_connected,
      })
      return null
    }

    // Check if token is expired and refresh if needed
    let accessToken = adminProfile.google_calendar_access_token
    const expiresAt = adminProfile.google_calendar_token_expires_at
    const now = new Date()
    
    // Only refresh if token is actually expired (with 5 minute buffer)
    const expirationBuffer = 5 * 60 * 1000 // 5 minutes
    const isExpired = expiresAt && new Date(expiresAt).getTime() <= (now.getTime() + expirationBuffer)
    
    if (isExpired) {
      // Token expired, refresh it
      logger.info('OAuth token expired, refreshing...', {
        expiresAt,
        now: now.toISOString(),
        adminId: adminProfile.id,
      })
      
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        logger.warn('Cannot refresh OAuth token - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set')
        // Don't return null - use existing token even if expired, let Google API handle it
        logger.warn('Will attempt to use expired token - Google API may refresh automatically')
      } else {
        try {
          const oauth2Client = new google.auth.OAuth2(
            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_CLIENT_SECRET,
            '' // Redirect URI not needed for refresh
          )

          oauth2Client.setCredentials({
            refresh_token: adminProfile.google_calendar_refresh_token,
          })

          const { credentials } = await oauth2Client.refreshAccessToken()
          
          if (!credentials.access_token) {
            logger.error('Failed to refresh OAuth token - no access_token in response', {
              hasRefreshToken: !!credentials.refresh_token,
              hasIdToken: !!credentials.id_token,
            })
            // Don't return null - use existing token, let Google API handle it
            logger.warn('Will attempt to use existing token - Google API may refresh automatically')
          } else {
            accessToken = credentials.access_token

            // Update token in database
            const newExpiresAt = credentials.expiry_date 
              ? new Date(credentials.expiry_date).toISOString()
              : new Date(Date.now() + 3600 * 1000).toISOString()

            // CRITICAL: Use a transaction-like approach - only update access_token and expires_at
            // NEVER clear refresh_token - it's permanent and must be preserved
            const updateData: any = {
              google_calendar_access_token: accessToken,
              google_calendar_token_expires_at: newExpiresAt,
            }
            
            // Only update refresh_token if Google provided a new one (rare but possible)
            if (credentials.refresh_token && credentials.refresh_token !== adminProfile.google_calendar_refresh_token) {
              logger.info('Google provided new refresh token, updating it', {
                adminId: adminProfile.id,
              })
              updateData.google_calendar_refresh_token = credentials.refresh_token
            }
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update(updateData)
              .eq('id', adminProfile.id)

            if (updateError) {
              logger.error('❌ Failed to update OAuth token in database', updateError, {
                adminId: adminProfile.id,
                updateDataKeys: Object.keys(updateData),
              })
              // Continue with new token even if DB update failed - don't lose the token
            } else {
              logger.info('✅ OAuth token refreshed and saved successfully', {
                adminId: adminProfile.id,
                newExpiresAt,
                updatedFields: Object.keys(updateData),
              })
            }
          }
        } catch (refreshError: any) {
          logger.error('Exception during OAuth token refresh', refreshError, {
            adminId: adminProfile.id,
            errorMessage: refreshError?.message,
            errorCode: refreshError?.code,
          })
          // Don't return null - use existing token, let Google API handle it
          logger.warn('Will attempt to use existing token despite refresh error - Google API may refresh automatically')
        }
      }
    } else {
      logger.info('OAuth token is still valid', {
        expiresAt,
        now: now.toISOString(),
        timeUntilExpiry: expiresAt ? `${Math.round((new Date(expiresAt).getTime() - now.getTime()) / 1000 / 60)} minutes` : 'unknown',
      })
    }

    // Create OAuth client
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return null
    }

    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      ''
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: adminProfile.google_calendar_refresh_token,
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const calendarId = adminProfile.google_calendar_id || 'primary'

    return { client: calendar, calendarId }
  } catch (error: any) {
    logger.error('Failed to get OAuth client', error)
    return null
  }
}

/**
 * Create a Google Calendar event with Google Meet link
 * 
 * @param eventData - Event details
 * @returns Event ID and Meet link
 */
export async function createCalendarEvent(
  eventData: CalendarEventData
): Promise<CalendarEventResult> {
  // Create event object
  const event = {
    summary: eventData.summary,
    description: `${eventData.description || 'Scheduled mentoring session via MVP-IQ'}\n\nParticipants:\n- Mentor: ${eventData.mentorEmail}\n- Student: ${eventData.userEmail}`,
    start: {
      dateTime: eventData.startTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: eventData.endTime.toISOString(),
      timeZone: 'UTC',
    },
  }

  // Use mentor's OAuth tokens if mentorId provided, otherwise fallback to admin
  const oauthClient = await getOAuthClient(eventData.mentorId)
  
  if (!oauthClient) {
    const errorMessage = eventData.mentorId 
      ? `Mentor has not connected their Google Calendar. Please ask the mentor to connect their calendar in settings.`
      : 'OAuth is not configured. Please connect Google Calendar in settings.'
    logger.error('❌ OAuth client not available', undefined, {
      hint: errorMessage,
      mentorId: eventData.mentorId,
      requiredEnvVars: {
        GOOGLE_CLIENT_ID: !!env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!env.GOOGLE_CLIENT_SECRET,
      },
    })
    throw new Error(errorMessage)
  }

  logger.info('Using OAuth client for calendar event creation', {
    calendarId: oauthClient.calendarId,
  })
  
  const { client: calendar, calendarId } = oauthClient
  const result = await createEventWithMeetLink(calendar, calendarId, event, 'oauth')
  
  logger.info('✅ Successfully created calendar event with OAuth', {
    eventId: result.eventId,
    hasMeetLink: !!result.meetLink,
    meetLink: result.meetLink || 'NOT GENERATED',
  })
  
  return result
}

/**
 * Helper function to create event with Meet link
 */
async function createEventWithMeetLink(
  calendar: any,
  calendarId: string,
  event: any,
  authType: 'oauth'
): Promise<CalendarEventResult> {
  let response: any
  let meetLink = ''
  
  // First, try creating event with conference data using the standard format
  try {
      response = await calendar.events.insert({
        calendarId,
        conferenceDataVersion: 1,
        requestBody: {
          ...event,
          conferenceData: {
            createRequest: {
              requestId: `mvpiq-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
        },
      })
      
      // Extract Meet link
      meetLink = response.data.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === 'video'
      )?.uri || ''
      
      // Sometimes Google doesn't return the Meet link immediately in the insert response
      // Fetch the event again to get the Meet link if it wasn't in the initial response
      // Try multiple times with increasing delays as Meet link creation can be asynchronous
      if (!meetLink && response.data.id) {
        logger.info('Meet link not in initial response, will retry fetching', { eventId: response.data.id })
        
        // Try fetching multiple times with increasing delays
        const retryDelays = [2000, 3000, 5000] // 2s, 3s, 5s
        for (let i = 0; i < retryDelays.length && !meetLink; i++) {
          await new Promise(resolve => setTimeout(resolve, retryDelays[i]))
          
          try {
            const fetchedEvent = await calendar.events.get({
              calendarId,
              eventId: response.data.id,
            })
            
            const fetchedData = fetchedEvent.data as any
            meetLink = fetchedData.conferenceData?.entryPoints?.find(
              (ep: any) => ep.entryPointType === 'video'
            )?.uri || ''
            
            if (meetLink) {
              logger.info('Meet link retrieved from fetched event', { 
                eventId: response.data.id, 
                meetLink,
                attempt: i + 1,
                delay: retryDelays[i],
                authType,
              })
              break
            } else {
              logger.warn(`Meet link still not available after attempt ${i + 1}`, {
                eventId: response.data.id,
                hasConferenceData: !!fetchedData.conferenceData,
                authType,
              })
            }
          } catch (fetchError: any) {
            logger.warn(`Failed to fetch event for Meet link (attempt ${i + 1})`, { 
              error: fetchError, 
              eventId: response.data.id,
              authType,
            })
          }
        }
      }
      
      // Log the full response for debugging
      logger.info('Calendar event created with conference data', {
        eventId: response.data.id,
        hasConferenceData: !!response.data.conferenceData,
        conferenceDataKeys: response.data.conferenceData ? Object.keys(response.data.conferenceData) : [],
        entryPoints: response.data.conferenceData?.entryPoints,
        entryPointsCount: response.data.conferenceData?.entryPoints?.length || 0,
        meetLink,
        fullConferenceData: JSON.stringify(response.data.conferenceData),
      })
      
      // If still no Meet link after fetching, log detailed info
      if (!meetLink) {
        logger.error('Meet link not generated - possible causes:', {
          eventId: response.data.id,
          calendarId,
          possibleCauses: [
            'Calendar owner may not have Google Meet enabled/licensed',
            'Calendar may not support Google Meet',
            'Meet link creation may be asynchronous - try fetching event again later',
            'OAuth token may not have sufficient permissions',
          ],
          conferenceData: response.data.conferenceData,
        })
      }
    } catch (error: any) {
      // If that fails with "Invalid conference type", try without specifying type
      if (error.message?.includes('conference type') || error.code === 400) {
        logger.warn('Failed with hangoutsMeet type, trying without explicit type', { error: error.message })
        
        try {
          // Try with just the createRequest, let Google decide the type
          response = await calendar.events.insert({
            calendarId,
            conferenceDataVersion: 1,
            requestBody: {
              ...event,
              conferenceData: {
                createRequest: {
                  requestId: `mvpiq-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                },
              },
            },
          })
          
          meetLink = response.data.conferenceData?.entryPoints?.find(
            (ep: any) => ep.entryPointType === 'video'
          )?.uri || ''
          
          logger.info('Calendar event created with minimal conference data', {
            eventId: response.data.id,
            hasConferenceData: !!response.data.conferenceData,
            meetLink,
            authType,
          })
        } catch (error2: any) {
          // If that also fails, create event without conference data and log the issue
          logger.error('Failed to create event with conference data', error2, { calendarId, authType })
          throw new Error(`Cannot create Google Meet link: ${error2.message || 'Unknown error'}. Make sure the calendar supports Google Meet.`)
        }
      } else {
        throw error
      }
    }

    if (!response.data.id) {
      throw new Error('Failed to create calendar event: no event ID returned')
    }
    
    // If we still don't have a Meet link, log a warning but don't fail
    if (!meetLink && authType === 'oauth') {
      logger.warn('Calendar event created with OAuth but no Meet link generated', {
        eventId: response.data.id,
        calendarId,
        hint: 'Calendar might not support Google Meet or Meet might not be enabled'
      })
    }

    logger.info('Google Calendar event created', {
      eventId: response.data.id,
      meetLink,
      calendarId,
      authType,
    })

    return {
      eventId: response.data.id,
      meetLink: meetLink || '',
    }
}

/**
 * Delete a Google Calendar event
 */
export async function deleteCalendarEvent(eventId: string, mentorId?: string): Promise<void> {
  // Use mentor's OAuth tokens if mentorId provided, otherwise fallback to admin
  const oauthClient = await getOAuthClient(mentorId)
  
  if (!oauthClient) {
    const errorMessage = mentorId 
      ? `Mentor has not connected their Google Calendar. Cannot delete event.`
      : 'OAuth is not configured. Cannot delete calendar event.'
    logger.error('❌ OAuth client not available for deletion', undefined, { eventId, mentorId })
    throw new Error(errorMessage)
  }

  try {
    const { client: calendar, calendarId } = oauthClient

    await calendar.events.delete({
      calendarId,
      eventId,
    })

    logger.info('Google Calendar event deleted', { eventId, calendarId })
  } catch (error: any) {
    logger.error('Failed to delete Google Calendar event', error, { eventId })
    throw error
  }
}

// Legacy functions - deprecated, kept for backward compatibility

/**
 * @deprecated OAuth is now required. Use createCalendarEvent directly.
 */
export async function refreshAccessToken(): Promise<string> {
  throw new Error('refreshAccessToken is deprecated. OAuth authentication is required.')
}

/**
 * @deprecated OAuth is now required. Calendar ID comes from OAuth connection.
 */
export function getCalendarId(calendarId?: string | null): string {
  return calendarId || 'primary'
}

/**
 * @deprecated OAuth is now required. Use /api/calendar/oauth/connect instead.
 */
export function getAuthUrl(): string {
  throw new Error('getAuthUrl is deprecated. Use /api/calendar/oauth/connect instead.')
}

/**
 * @deprecated Not used - availability is managed in MVPIQ database.
 */
export async function getAvailableSlots(): Promise<Array<{ start: Date; end: Date }>> {
  return []
}

/**
 * @deprecated OAuth is now required. Use /api/calendar/oauth/callback instead.
 */
export async function exchangeCodeForTokens(): Promise<{ accessToken: string; refreshToken: string }> {
  throw new Error('exchangeCodeForTokens is deprecated. Use /api/calendar/oauth/callback instead.')
}

/**
 * @deprecated OAuth is now required. Calendar ID comes from OAuth connection.
 */
export async function getPrimaryCalendarId(): Promise<string> {
  return 'primary'
}
