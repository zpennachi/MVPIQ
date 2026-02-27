import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This endpoint creates an email draft for pros when a video is submitted
export async function POST(request: NextRequest) {
  try {
    const { submissionId, proEmail } = await request.json()

    if (!submissionId || !proEmail) {
      return NextResponse.json(
        { error: 'submissionId and proEmail are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get submission details
    const { data: submission, error: subError } = await supabaseAdmin
      .from('feedback_submissions')
      .select(`
        *,
        videos(*),
        player:profiles!feedback_submissions_player_id_fkey(*)
      `)
      .eq('id', submissionId)
      .single()

    if (subError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    const video = (submission as any).videos
    const player = (submission as any).player

    // Get pro profile
    const { data: proProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', proEmail)
      .eq('role', 'mentor')
      .single()

    if (!proProfile) {
      return NextResponse.json(
        { error: 'Pro not found' },
        { status: 404 }
      )
    }

    // Create email draft content
    const emailContent = `
Player Notes:
${submission.player_notes || 'No specific notes provided'}

Player Numbers:
${video.player_numbers || 'Not specified'}

Video URL:
${video.video_url || video.file_path}

---

Provide your feedback below this line:
`

    // Send email draft to pro using Resend
    const resendResponse = await fetch(`${request.nextUrl.origin}/api/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'pro_feedback_draft',
        email: proEmail,
        data: {
          submissionId: submissionId,
          videoTitle: video.title,
          videoUrl: video.video_url || video.file_path,
          playerName: (player.first_name && player.last_name) ? `${player.first_name} ${player.last_name}` : (player.first_name || player.last_name || player.email || 'Player'),
          playerNotes: submission.player_notes,
          playerNumbers: video.player_numbers,
          emailContent: emailContent,
        },
      }),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json()
      console.error('Failed to send email draft:', errorData)
    }

    // Update submission with pro_id and email_draft_id
    await supabaseAdmin
      .from('feedback_submissions')
      .update({
        pro_id: proProfile.id,
        status: 'assigned',
        email_draft_id: `draft_${submissionId}_${Date.now()}`,
      })
      .eq('id', submissionId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error creating email draft:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
