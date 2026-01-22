import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/education-videos/upload
 * Uploads a video file to Supabase storage and returns the public URL
 * Uses service role key to bypass RLS
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type - only web-compatible formats
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg']
    const validExtensions = ['.mp4', '.webm', '.ogg', '.ogv']
    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    
    if (!validVideoTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a web-compatible video file (MP4, WebM, or OGG only).' },
        { status: 400 }
      )
    }

    // Validate file size (max 500MB for education videos)
    const maxSize = 500 * 1024 * 1024 // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 500MB limit' },
        { status: 400 }
      )
    }

    // Use service role key for storage operations
    const supabaseAdmin = createAdminClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'mp4'
    const fileName = `education/${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase storage
    // First, check if the bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
    
    if (listError) {
      logger.error('Error listing buckets', listError)
      return NextResponse.json(
        { 
          error: 'Failed to access storage. Please ensure the education-videos bucket exists in Supabase Storage.',
          hint: 'Go to Supabase Dashboard > Storage > Create bucket named "education-videos" (public, 500MB limit)'
        },
        { status: 500 }
      )
    }

    const educationBucket = buckets?.find(b => b.name === 'education-videos')
    
    if (!educationBucket) {
      // Try to create bucket if it doesn't exist
      logger.info('education-videos bucket not found, attempting to create...')
      const { data: newBucket, error: createError } = await supabaseAdmin.storage.createBucket('education-videos', {
        public: true,
        fileSizeLimit: 524288000, // 500MB
      })

      if (createError) {
        logger.error('Could not create education-videos bucket', createError)
        return NextResponse.json(
          { 
            error: 'The education-videos bucket does not exist and could not be created automatically.',
            hint: 'Please create the bucket manually: Go to Supabase Dashboard > Storage > Create bucket named "education-videos" (make it public, set file size limit to 500MB)'
          },
          { status: 400 }
        )
      }

      logger.info('Successfully created education-videos bucket', { bucket: newBucket })
    }

    // Upload file
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('education-videos')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      logger.error('Error uploading education video', uploadError, { adminId: user.id, fileName })
      
      // Provide helpful error message for bucket not found
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
        return NextResponse.json(
          { 
            error: 'Storage bucket not found. Please create the "education-videos" bucket in Supabase Storage.',
            hint: 'Go to Supabase Dashboard > Storage > Create bucket named "education-videos" (make it public, set file size limit to 500MB)'
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: uploadError.message || 'Failed to upload video' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('education-videos')
      .getPublicUrl(fileName)

    logger.info('Education video uploaded successfully', {
      adminId: user.id,
      fileName,
      fileSize: file.size,
      publicUrl,
    })

    return NextResponse.json({
      success: true,
      video_url: publicUrl,
      file_name: fileName,
    })
  } catch (error: any) {
    logger.error('Exception in education video upload endpoint', error, {})
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
