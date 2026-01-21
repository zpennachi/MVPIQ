'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User, Mail, Phone, Save, X, Upload, Camera, Calendar, CheckCircle, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import type { Profile } from '@/types/database'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [connectingCalendar, setConnectingCalendar] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
  })
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const photoFile = acceptedFiles[0]
    if (photoFile) {
      // Check file type
      if (!photoFile.type.startsWith('image/')) {
        setError('File must be an image')
        return
      }
      // Check file size (max 5MB)
      if (photoFile.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }
      setProfilePhoto(photoFile)
      setError(null)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(photoFile)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    disabled: saving || uploadingPhoto
  })

  const removePhoto = () => {
    setProfilePhoto(null)
    setPhotoPreview(null)
  }

  useEffect(() => {
    loadProfile()
    
    // Check for OAuth callback messages in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const calendarError = params.get('calendar_error')
      const calendarConnected = params.get('calendar_connected')
      
      if (calendarError) {
        setError(`Calendar connection failed: ${calendarError}`)
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname)
      } else if (calendarConnected === 'true') {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 5000)
        // Reload profile to get updated calendar status
        loadProfile()
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        const profileData = data as Profile
        setProfile(profileData)
        setFormData({
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          phone_number: profileData.phone_number || '',
        })
        setCurrentPhotoUrl(profileData.profile_photo_url || null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let photoUrl = currentPhotoUrl

      // Upload profile photo if a new one was selected
      if (profilePhoto) {
        setUploadingPhoto(true)
        try {
          // Delete old photo if exists
          if (currentPhotoUrl) {
            try {
              const oldFileName = currentPhotoUrl.split('/').pop()?.split('?')[0]
              if (oldFileName) {
                const oldPath = `${user.id}/${oldFileName}`
                await supabase.storage
                  .from('profile-photos')
                  .remove([oldPath])
              }
            } catch (deleteErr) {
              // Ignore delete errors
              console.error('Error deleting old photo:', deleteErr)
            }
          }

          const fileExt = profilePhoto.name.split('.').pop()
          const fileName = `${user.id}/profile_${Date.now()}.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from('profile-photos')
            .upload(fileName, profilePhoto, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) throw uploadError

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('profile-photos')
            .getPublicUrl(fileName)

          photoUrl = publicUrl
        } catch (photoErr: any) {
          throw new Error(`Failed to upload photo: ${photoErr.message}`)
        } finally {
          setUploadingPhoto(false)
        }
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          phone_number: formData.phone_number || null,
          profile_photo_url: photoUrl,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update email if changed
      if (formData.email !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email,
        })

        if (emailError) throw emailError
      }

      setSuccess(true)
      setProfilePhoto(null)
      setPhotoPreview(null)
      await loadProfile()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#d9d9d9]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="dotted-bg-subtle rounded-lg p-4 -m-4 sm:-m-6 lg:-m-8 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Account Settings</h1>
        <p className="mt-2 text-sm sm:text-base text-[#d9d9d9]">
          Manage your account information and preferences
        </p>
      </div>

      <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/20 border border-green-800 text-green-400 px-4 py-3 rounded text-sm">
              Profile updated successfully!
            </div>
          )}

          {/* Profile Photo Section */}
          <div>
            <label className="block text-sm font-medium text-[#d9d9d9] mb-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Profile Photo
              </div>
            </label>
            {currentPhotoUrl && !photoPreview && (
              <div className="mb-4">
                <div className="relative inline-block">
                  <img
                    src={currentPhotoUrl}
                    alt="Current profile"
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#ffc700]/40"
                  />
                </div>
              </div>
            )}
            {!photoPreview ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-[#ffc700] bg-[#ffc700]/10'
                    : 'border-[#272727] hover:border-[#ffc700]/40 hover-lift'
                } ${saving || uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto text-[#ffc700] mb-2" />
                <p className="text-sm text-[#d9d9d9]">
                  {isDragActive
                    ? 'Drop the image here'
                    : currentPhotoUrl ? 'Click to change photo or drag and drop' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-[#d9d9d9]/70 mt-1">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
            ) : (
              <div className="relative mb-4">
                <div className="border border-[#272727] rounded-lg p-4 bg-[#272727]/50">
                  <div className="flex items-center gap-4">
                    <img
                      src={photoPreview}
                      alt="Profile preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-[#ffc700]/40"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{profilePhoto?.name}</p>
                      <p className="text-xs text-[#d9d9d9]/70">
                        {((profilePhoto?.size || 0) / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removePhoto}
                      disabled={saving || uploadingPhoto}
                      className="text-red-400 hover:text-red-300 p-2 transition-all duration-300 active:scale-95 disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#d9d9d9] mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] transition-all duration-300 touch-manipulation placeholder:text-[#d9d9d9]/50"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#d9d9d9] mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] transition-all duration-300 touch-manipulation placeholder:text-[#d9d9d9]/50"
              placeholder="Enter your email"
            />
            <p className="text-xs text-[#d9d9d9]/70 mt-1">
              Changing your email will require verification
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#d9d9d9] mb-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number (Optional)
              </div>
            </label>
            <input
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] transition-all duration-300 touch-manipulation placeholder:text-[#d9d9d9]/50"
              placeholder="(555) 123-4567"
            />
            <p className="text-xs text-[#d9d9d9]/70 mt-1">
              Add your phone number for important notifications
            </p>
          </div>

          {/* Google Calendar Connection (for mentors) */}
          {profile?.role === 'mentor' && (
            <div className="border-t border-[#272727] pt-6 mt-6">
              <label className="block text-sm font-medium text-[#d9d9d9] mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Google Calendar Integration
                </div>
              </label>
              
              {profile.google_calendar_connected ? (
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-400">Calendar Connected</p>
                      <p className="text-xs text-[#d9d9d9]/70 mt-1">
                        Your Google Calendar is connected. Sessions will automatically sync to your calendar.
                      </p>
                      {profile.google_calendar_id && (
                        <p className="text-xs text-[#d9d9d9]/50 mt-1">
                          Calendar ID: {profile.google_calendar_id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#272727]/50 border border-[#272727] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#ffc700] mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#d9d9d9] mb-2">Connect Your Calendar</p>
                      <p className="text-xs text-[#d9d9d9]/70 mb-4">
                        Connect your Google Calendar to automatically sync sessions, create events, and generate Google Meet links.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          setConnectingCalendar(true)
                          setError(null)
                          try {
                            const response = await fetch('/api/calendar/connect')
                            const data = await response.json()
                            
                            if (!response.ok) {
                              throw new Error(data.error || 'Failed to connect calendar')
                            }
                            
                            // Redirect to Google OAuth
                            window.location.href = data.authUrl
                          } catch (err: any) {
                            setError(err.message || 'Failed to connect calendar')
                            setConnectingCalendar(false)
                          }
                        }}
                        disabled={connectingCalendar}
                        className="px-4 py-2 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-95 font-medium text-sm flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        {connectingCalendar ? 'Connecting...' : 'Connect Google Calendar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2.5 border border-[#272727] rounded-md text-[#d9d9d9] hover:bg-[#272727] transition-all duration-300 active:scale-95 font-medium touch-manipulation flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-95 hover:shadow-lg font-medium touch-manipulation flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving || uploadingPhoto ? (uploadingPhoto ? 'Uploading photo...' : 'Saving...') : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
