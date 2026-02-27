'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EducationVideo } from '@/types/database'
import { BookOpen, Filter } from 'lucide-react'
import { VideoPlayerModal } from '@/components/video/VideoPlayerModal'
import { VideoThumbnail } from '@/components/education/VideoThumbnail'

export function EducationSection() {
  const [videos, setVideos] = useState<EducationVideo[]>([])
  const [filteredVideos, setFilteredVideos] = useState<EducationVideo[]>([])
  const [selectedPosition, setSelectedPosition] = useState<string>('all')
  const [positions, setPositions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<EducationVideo | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadVideos()
  }, [])

  useEffect(() => {
    if (selectedPosition === 'all') {
      setFilteredVideos(videos)
    } else {
      setFilteredVideos(videos.filter(v => v.position === selectedPosition))
    }
  }, [selectedPosition, videos])

  const loadVideos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('education_videos')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setVideos(data as EducationVideo[])
      const uniquePositions = [...new Set(data.map(v => v.position).filter(Boolean))]
      setPositions(uniquePositions as string[])
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="dotted-bg-subtle rounded-lg p-4 -m-4 sm:-m-6 lg:-m-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 dark:text-yellow-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Education</h1>
          </div>
          {positions.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="flex-1 sm:flex-none border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm sm:text-base touch-manipulation"
              >
                <option value="all">All Positions</option>
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p className="text-sm sm:text-base">No training videos available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-lg transition"
            >
              <VideoThumbnail
                videoUrl={video.video_url}
                title={video.title}
                onClick={() => {
                  setSelectedVideo(video)
                  setShowVideoModal(true)
                }}
                className="mb-3 sm:mb-4"
                playIconClassName="text-yellow-500 dark:text-yellow-400"
              />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 break-words">
                {video.title}
              </h3>
              {video.position && (
                <span className="inline-block px-2 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded text-xs font-medium mb-2">
                  {video.position}
                </span>
              )}
              {video.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 break-words">
                  {video.description}
                </p>
              )}
              <button
                onClick={() => {
                  setSelectedVideo(video)
                  setShowVideoModal(true)
                }}
                className="mt-3 sm:mt-4 inline-block text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300 font-medium text-sm touch-manipulation"
              >
                Watch Video →
              </button>
            </div>
          ))}
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
