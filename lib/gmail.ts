/**
 * Gmail Integration Utilities
 * 
 * Uses OAuth authentication to send emails via Gmail API.
 * Reuses the same OAuth tokens as Google Calendar integration.
 */

import { google } from 'googleapis'
import { env } from './env'
import { logger } from './logger'
import { createClient } from '@supabase/supabase-js'

export interface GmailSendOptions {
  to: string
  subject: string
  html: string
  from?: string // Optional, defaults to mvpiqweb@gmail.com
}

export interface GmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Get OAuth client for Gmail using admin account
 * All emails are sent from mvpiqweb@gmail.com using a single admin's OAuth tokens
 * Returns null if no OAuth tokens are available
 */
async function getGmailOAuthClient(): Promise<{ client: any } | null> {
  try {
    // Use service role key to bypass RLS and fetch admin tokens
    // This is necessary because emails might be sent from background jobs without user context
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
    
    // Always use admin account for sending emails (centralized email management)
    const { data: adminProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expires_at')
      .eq('role', 'admin')
    
    if (profileError) {
      logger.warn('Error fetching admin profiles for Gmail', { 
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
      logger.warn('No admin profile with OAuth tokens found for Gmail', {
        totalAdmins: adminProfiles?.length || 0,
        adminsWithTokens: adminProfiles?.filter(p => p.google_calendar_access_token && p.google_calendar_refresh_token).length || 0,
      })
      return null
    }

    if (!adminProfile.google_calendar_access_token || !adminProfile.google_calendar_refresh_token) {
      logger.warn('OAuth tokens missing in admin profile for Gmail', {
        adminId: adminProfile.id,
        hasAccessToken: !!adminProfile.google_calendar_access_token,
        hasRefreshToken: !!adminProfile.google_calendar_refresh_token,
      })
      return null
    }

    // Use admin's tokens
    const userProfile = adminProfile
      
      // Check if token is expired and refresh if needed
      let accessToken = userProfile.google_calendar_access_token
      const expiresAt = userProfile.google_calendar_token_expires_at
      const now = new Date()
      
      // Only refresh if token is actually expired (with 5 minute buffer)
      const expirationBuffer = 5 * 60 * 1000 // 5 minutes
      const isExpired = expiresAt && new Date(expiresAt).getTime() <= (now.getTime() + expirationBuffer)
      
      if (isExpired) {
        // Token expired, refresh it
        logger.info('OAuth token expired, refreshing for Gmail...', {
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
                logger.info('✅ OAuth token refreshed and saved successfully for Gmail', {
                  userId: userProfile.id,
                  newExpiresAt,
                })
              }
            }
          } catch (refreshError: any) {
            logger.error('Exception during OAuth token refresh for Gmail', refreshError, {
              userId: userProfile.id,
              errorMessage: refreshError?.message,
              errorCode: refreshError?.code,
            })
            logger.warn('Will attempt to use existing token despite refresh error - Google API may refresh automatically')
          }
        }
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

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

      return { client: gmail }
  } catch (error: any) {
    logger.error('Failed to get Gmail OAuth client', error)
    return null
  }
}

/**
 * Send an email via Gmail API
 * All emails are sent from mvpiqweb@gmail.com using admin's OAuth tokens
 */
export async function sendGmailEmail(options: GmailSendOptions): Promise<GmailSendResult> {
  try {
    const fromEmail = options.from || 'mvpiqweb@gmail.com'
    
    // Always use admin's OAuth tokens for centralized email sending
    const oauthClient = await getGmailOAuthClient()
    
    if (!oauthClient) {
      const errorMessage = 'Gmail OAuth is not configured. Please connect Google account in settings as an admin user.'
      logger.error('❌ Gmail OAuth client not available', undefined, {
        hint: errorMessage,
        to: options.to,
      })
      return {
        success: false,
        error: errorMessage,
      }
    }

    const { client: gmail } = oauthClient

    // Create email message in RFC 2822 format
    const emailContent = [
      `From: ${fromEmail}`,
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      options.html,
    ].join('\n')

    // Encode message in base64url format (Gmail API requirement)
    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Send email via Gmail API
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    })

    const messageId = response.data.id

    logger.info('✅ Email sent successfully via Gmail API', {
      messageId,
      to: options.to,
      subject: options.subject,
      from: fromEmail,
    })

    return {
      success: true,
      messageId,
    }
  } catch (error: any) {
    logger.error('Failed to send email via Gmail API', error, {
      to: options.to,
      subject: options.subject,
      errorMessage: error?.message,
      errorCode: error?.code,
    })
    
    return {
      success: false,
      error: error?.message || 'Failed to send email via Gmail API',
    }
  }
}
