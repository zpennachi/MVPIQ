import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/feedback/mark-viewed
 * Mark a feedback submission as viewed by the current user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { submissionId } = body

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 })
    }

    // Verify the submission belongs to the user
    const { data: submission, error: submissionError } = await supabase
      .from('feedback_submissions')
      .select('player_id')
      .eq('id', submissionId)
      .eq('player_id', user.id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found or unauthorized' }, { status: 404 })
    }

    // Insert or update viewed_feedback record (using upsert with ON CONFLICT)
    const { error: insertError } = await supabase
      .from('viewed_feedback')
      .upsert({
        user_id: user.id,
        submission_id: submissionId,
        viewed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,submission_id',
      })

    if (insertError) {
      console.error('Error marking feedback as viewed:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in mark-viewed route:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
