'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EducationVideo } from '@/types/database'
import { Search, Edit, Trash2, Upload, BookOpen, X } from 'lucide-react'
import { format } from 'date-fns'
import { VideoPlayerModal } from '@/components/video/VideoPlayerModal'
import { VideoThumbnail } from '@/components/education/VideoThumbnail'

interface EducationManagementProps {
  adminId: string
}

export function EducationManagement({ adminId }: EducationManagementProps) {
  const [videos, setVideos] = useState<EducationVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingVideo, setEditingVideo] = useState<EducationVideo | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    position: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'url'>('url')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedVideo, setSelectedVideo] = useState<EducationVideo | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadVideos()
  }, [adminId])

  const loadVideos = async () => {
    setLoading(true)
    try {
      // Use admin API endpoint to bypass RLS
      const response = await fetch('/api/admin/education-videos')
      const result = await response.json()

      if (!response.ok) {
        console.error('Error loading education videos:', result.error)
        setVideos([])
        return
      }

      setVideos(result.videos || [])
    } catch (error) {
      console.error('Error loading education videos:', error)
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let videoUrl = formData.video_url

      // If uploading a file, upload it first
      if (uploadMethod === 'upload' && selectedFile && !editingVideo) {
        setUploading(true)
        setUploadProgress(0)

        const uploadFormData = new FormData()
        uploadFormData.append('file', selectedFile)

        const uploadResponse = await fetch('/api/admin/education-videos/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadData = await uploadResponse.json()

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || 'Failed to upload video')
        }

        videoUrl = uploadData.video_url
        setUploadProgress(100)
        setUploading(false)
      }

      // Save video metadata
      const url = editingVideo 
        ? `/api/admin/education-videos/${editingVideo.id}`
        : '/api/admin/education-videos'
      
      const method = editingVideo ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          video_url: videoUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save video')
      }

      alert(editingVideo ? 'Video updated successfully!' : 'Video added successfully!')
      setShowUploadModal(false)
      setEditingVideo(null)
      setFormData({ title: '', description: '', video_url: '', position: '' })
      setSelectedFile(null)
      setUploadMethod('url')
      loadVideos()
    } catch (error: any) {
      alert(error.message || 'Failed to save video')
      setUploading(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (video: EducationVideo) => {
    setEditingVideo(video)
    setFormData({
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      position: video.position || '',
    })
    setUploadMethod('url') // Editing always uses URL (can't re-upload)
    setSelectedFile(null)
    setShowUploadModal(true)
  }

  const handleDelete = async (videoId: string, videoTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${videoTitle}"?`)) return

    try {
      const response = await fetch(`/api/admin/education-videos/${videoId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete video')
      }

      alert('Video deleted successfully!')
      loadVideos()
    } catch (error: any) {
      alert(error.message || 'Failed to delete video')
    }
  }

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (video.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (video.position?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-[#272727] rounded w-1/3 animate-pulse"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-[#272727] rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dotted-bg-subtle rounded-lg p-4 -m-4 sm:-m-6 lg:-m-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Education Management</h2>
            <p className="text-sm text-[#d9d9d9] mt-1">Manage educational videos for all users</p>
          </div>
          <button
            onClick={() => {
              setEditingVideo(null)
              setFormData({ title: '', description: '', video_url: '', position: '' })
              setShowUploadModal(true)
            }}
            className="px-4 py-2 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg flex items-center gap-2 font-medium relative z-10"
            type="button"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Add Video</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#d9d9d9]" />
        <input
          type="text"
          placeholder="Search videos by title, description, or position..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-[#272727] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
        />
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVideos.map((video) => (
          <div
            key={video.id}
            className="bg-black border border-[#272727] rounded-lg p-4 hover:border-[#ffc700]/40 transition-all duration-300"
          >
            <VideoThumbnail
              videoUrl={video.video_url}
              title={video.title}
              onClick={() => {
                setSelectedVideo(video)
                setShowVideoModal(true)
              }}
              className="mb-3"
              playIconClassName="text-[#ffc700]"
            />
            <h3 className="font-semibold text-white mb-2 break-words">{video.title}</h3>
            {video.position && (
              <span className="inline-block px-2 py-1 bg-[#ffc700]/20 text-[#ffc700] rounded text-xs font-medium mb-2">
                {video.position}
              </span>
            )}
            {video.description && (
              <p className="text-sm text-[#d9d9d9] mb-3 line-clamp-2 break-words">{video.description}</p>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-[#272727]">
              <span className="text-xs text-[#d9d9d9]/70">
                {format(new Date(video.created_at), 'MMM d, yyyy')}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(video)}
                  className="p-2 text-[#ffc700] hover:bg-[#272727] rounded transition"
                  title="Edit video"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(video.id, video.title)}
                  className="p-2 text-red-400 hover:bg-[#272727] rounded transition"
                  title="Delete video"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-12 bg-black border border-[#272727] rounded-lg">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-[#272727]" />
          <p className="text-[#d9d9d9]">No education videos found</p>
        </div>
      )}

      <div className="text-sm text-[#d9d9d9]">
        Showing {filteredVideos.length} of {videos.length} videos
      </div>

      {/* Upload/Edit Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-black border border-[#272727] rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {editingVideo ? 'Edit Video' : 'Add Education Video'}
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setEditingVideo(null)
                  setFormData({ title: '', description: '', video_url: '', position: '' })
                  setSelectedFile(null)
                  setUploadMethod('url')
                }}
                className="text-[#d9d9d9] hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-[#d9d9d9] mb-1">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
                  placeholder="Video title"
                />
              </div>

              {/* Video Upload Method Toggle */}
              {!editingVideo && (
                <div>
                  <label className="block text-sm font-medium text-[#d9d9d9] mb-2">
                    Video Source *
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadMethod('upload')
                        setFormData({ ...formData, video_url: '' })
                        setSelectedFile(null)
                      }}
                      className={`flex-1 px-4 py-2 rounded-md transition ${
                        uploadMethod === 'upload'
                          ? 'bg-[#ffc700] text-black font-medium'
                          : 'bg-[#272727] text-[#d9d9d9] hover:bg-[#272727]/80'
                      }`}
                    >
                      Upload Video
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadMethod('url')
                        setSelectedFile(null)
                      }}
                      className={`flex-1 px-4 py-2 rounded-md transition ${
                        uploadMethod === 'url'
                          ? 'bg-[#ffc700] text-black font-medium'
                          : 'bg-[#272727] text-[#d9d9d9] hover:bg-[#272727]/80'
                      }`}
                    >
                      Video URL
                    </button>
                  </div>
                </div>
              )}

              {/* File Upload */}
              {!editingVideo && uploadMethod === 'upload' && (
                <div>
                  <label htmlFor="video_file" className="block text-sm font-medium text-[#d9d9d9] mb-1">
                    Video File *
                  </label>
                  <input
                    id="video_file"
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,.mp4,.webm,.ogg,.ogv"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setSelectedFile(file)
                        // Clear URL when file is selected
                        setFormData({ ...formData, video_url: '' })
                      }
                    }}
                    required={uploadMethod === 'upload' && !editingVideo}
                    className="w-full px-3 py-2 border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[#ffc700] file:text-black hover:file:bg-[#e6b300]"
                  />
                  {selectedFile && (
                    <div className="mt-2 p-3 bg-[#272727]/50 rounded-md">
                      <p className="text-sm text-[#d9d9d9]">
                        <strong>Selected:</strong> {selectedFile.name}
                      </p>
                      <p className="text-xs text-[#d9d9d9]/70">
                        Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                  {uploading && (
                    <div className="mt-2">
                      <div className="w-full bg-[#272727] rounded-full h-2">
                        <div
                          className="bg-[#ffc700] h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-[#d9d9d9]/70 mt-1">Uploading... {uploadProgress}%</p>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-[#d9d9d9]/70">
                    Upload a web-compatible video file (MP4, WebM, or OGG - max 500MB). Video will be hosted on Supabase.
                  </p>
                </div>
              )}

              {/* Video URL Input */}
              {(editingVideo || uploadMethod === 'url') && (
                <div>
                  <label htmlFor="video_url" className="block text-sm font-medium text-[#d9d9d9] mb-1">
                    Video URL *
                  </label>
                  <input
                    id="video_url"
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    required={uploadMethod === 'url' || !!editingVideo}
                    className="w-full px-3 py-2 border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
                    placeholder="https://youtube.com/watch?v=... or other video URL"
                  />
                  <p className="mt-1 text-xs text-[#d9d9d9]/70">
                    Enter a video URL (YouTube, Vimeo, or direct video link)
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[#d9d9d9] mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] resize-none"
                  placeholder="Video description (optional)"
                />
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-[#d9d9d9] mb-1">
                  Position
                </label>
                <input
                  id="position"
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
                  placeholder="e.g., Quarterback, Running Back (optional)"
                />
                <p className="mt-1 text-xs text-[#d9d9d9]/70">
                  Position filter for categorizing videos (optional)
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="flex-1 px-4 py-2 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  {uploading ? 'Uploading...' : submitting ? 'Saving...' : (editingVideo ? 'Update Video' : 'Add Video')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    setEditingVideo(null)
                    setFormData({ title: '', description: '', video_url: '', position: '' })
                    setSelectedFile(null)
                    setUploadMethod('url')
                  }}
                  className="px-4 py-2 border border-[#272727] text-[#d9d9d9] rounded-md hover:bg-[#272727] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayerModal
          isOpen={showVideoModal}
          onClose={() => {
            setShowVideoModal(false)
            setSelectedVideo(null)
          }}
          videoUrl={selectedVideo.video_url}
          videoTitle={selectedVideo.title}
        />
      )}
    </div>
  )
}
