'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useDropzone } from 'react-dropzone'
import { Upload, X, User } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'player' as const,
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const supabase = createClient()

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
    disabled: loading || googleLoading || uploadingPhoto
  })

  const removePhoto = () => {
    setProfilePhoto(null)
    setPhotoPreview(null)
  }

  const handleGoogleSignUp = async () => {
    setError(null)
    setGoogleLoading(true)

    try {
      // Always use current origin (will be Vercel URL when deployed)
      // This ensures we use the correct URL whether dev or production
      const redirectUrl = window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectUrl}/auth/callback?next=/dashboard`,
          scopes: 'email profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setGoogleLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: formData.role,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        // Upload profile photo if provided
        if (profilePhoto && data.user) {
          setUploadingPhoto(true)
          try {
            const fileExt = profilePhoto.name.split('.').pop()
            const fileName = `${data.user.id}/profile_${Date.now()}.${fileExt}`
            
            const { error: uploadError } = await supabase.storage
              .from('profile-photos')
              .upload(fileName, profilePhoto, {
                cacheControl: '3600',
                upsert: false,
              })

            if (uploadError) {
              console.error('Photo upload error:', uploadError)
              // Don't fail registration if photo upload fails
            } else {
              // Get public URL and update profile
              const { data: { publicUrl } } = supabase.storage
                .from('profile-photos')
                .getPublicUrl(fileName)

              await supabase
                .from('profiles')
                .update({ profile_photo_url: publicUrl })
                .eq('id', data.user.id)
            }
          } catch (photoErr: any) {
            console.error('Photo upload error:', photoErr)
            // Don't fail registration if photo upload fails
          } finally {
            setUploadingPhoto(false)
          }
        }

        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black dotted-bg px-4 py-8">
      <div className="max-w-md w-full bg-black border border-[#272727] rounded-lg shadow-mvp p-6 sm:p-8 relative z-10">
        <div className="flex justify-center mb-6">
          <Logo height={60} variant="dark" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-[#d9d9d9]">Create Account</h1>
        
        {error && (
          <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignUp}
          disabled={googleLoading || loading}
          className="w-full bg-black border border-[#272727] text-[#d9d9d9] py-2.5 rounded-md hover:bg-[#272727] disabled:opacity-50 disabled:cursor-not-allowed transition mb-4 flex items-center justify-center gap-2 font-medium touch-manipulation"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? 'Signing up...' : 'Continue with Google'}
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or</span>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-[#d9d9d9] mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-[#d9d9d9] mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#d9d9d9] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#d9d9d9] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
            />
          </div>


          {/* Profile Photo Upload (Optional) */}
          <div>
            <label className="block text-sm font-medium text-[#d9d9d9] mb-1">
              Profile Photo <span className="text-[#d9d9d9]/70 text-xs font-normal">(Optional)</span>
            </label>
            {!photoPreview ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-[#ffc700] bg-[#ffc700]/10'
                    : 'border-[#272727] hover:border-[#ffc700]/40 hover-lift'
                } ${loading || googleLoading || uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <User className="w-8 h-8 mx-auto text-[#ffc700] mb-2" />
                <p className="text-sm text-[#d9d9d9]">
                  {isDragActive
                    ? 'Drop the image here'
                    : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-[#d9d9d9]/70 mt-1">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="border border-[#272727] rounded-lg p-4 bg-[#272727]/50">
                  <div className="flex items-center gap-4">
                    <img
                      src={photoPreview}
                      alt="Profile preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#ffc700]/40"
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
                      disabled={loading || googleLoading || uploadingPhoto}
                      className="text-red-400 hover:text-red-300 p-2 transition-all duration-300 active:scale-95 disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-[#ffc700] text-black py-2.5 rounded-md hover:bg-[#e6b300] disabled:opacity-50 disabled:cursor-not-allowed transition font-medium touch-manipulation"
          >
            {loading || uploadingPhoto ? (uploadingPhoto ? 'Uploading photo...' : 'Creating account...') : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[#d9d9d9]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#ffc700] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
