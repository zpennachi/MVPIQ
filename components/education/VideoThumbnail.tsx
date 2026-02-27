'use client'

import { useState, useRef, useEffect } from 'react'
import { Play } from 'lucide-react'

interface VideoThumbnailProps {
  videoUrl: string
  title?: string
  onClick: () => void
  className?: string
  playIconClassName?: string
}

/**
 * Extract YouTube video ID from various URL formats
 */
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Check if URL is a YouTube URL
 */
function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url)
}

/**
 * Get YouTube thumbnail URL
 */
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
}

export function VideoThumbnail({
  videoUrl,
  title,
  onClick,
  className = '',
  playIconClassName = '',
}: VideoThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [thumbnailError, setThumbnailError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Check if it's a YouTube URL
    if (isYouTubeUrl(videoUrl)) {
      const videoId = getYouTubeVideoId(videoUrl)
      if (videoId) {
        setThumbnailUrl(getYouTubeThumbnail(videoId))
        return
      }
    }

    // For uploaded videos, try to generate thumbnail from video
    // This will work if CORS allows it, otherwise falls back to play button
    if (videoRef.current) {
      const video = videoRef.current
      
      const handleLoadedMetadata = () => {
        if (canvasRef.current && video && video.duration) {
          const canvas = canvasRef.current
          canvas.width = video.videoWidth || 640
          canvas.height = video.videoHeight || 360
          
          // Seek to 1 second (or first frame if video is shorter)
          const seekTime = Math.min(1, video.duration / 2)
          video.currentTime = seekTime
        }
      }

      const handleSeeked = () => {
        if (canvasRef.current && video && videoRef.current) {
          try {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
              setThumbnailUrl(thumbnail)
            }
          } catch (error) {
            // CORS or other error, fall back to play button
            console.warn('Could not generate thumbnail:', error)
          }
        }
      }

      const handleError = () => {
        // Video load error, fall back to play button
        setThumbnailError(true)
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      video.addEventListener('seeked', handleSeeked)
      video.addEventListener('error', handleError)

      // Load video to generate thumbnail
      video.load()

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('seeked', handleSeeked)
        video.removeEventListener('error', handleError)
      }
    }
  }, [videoUrl])

  const handleThumbnailError = () => {
    setThumbnailError(true)
  }

  return (
    <>
      {/* Hidden video element for thumbnail generation */}
      {!isYouTubeUrl(videoUrl) && (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            className="hidden"
            preload="metadata"
            crossOrigin="anonymous"
          />
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}

      {/* Thumbnail Button */}
      <button
        onClick={onClick}
        className={`relative w-full aspect-video rounded-lg overflow-hidden group ${className}`}
        type="button"
      >
        {thumbnailUrl && !thumbnailError ? (
          <>
            <img
              src={thumbnailUrl}
              alt={title || 'Video thumbnail'}
              className="w-full h-full object-cover"
              onError={handleThumbnailError}
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition flex items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/60 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform backdrop-blur-sm">
                <Play className={`w-8 h-8 sm:w-10 sm:h-10 text-white ${playIconClassName || 'text-white'}`} fill="currentColor" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-[#272727] dark:bg-gray-900 flex items-center justify-center group-hover:bg-[#272727]/80 dark:group-hover:bg-gray-800 transition">
            <Play className={`w-12 h-12 sm:w-16 sm:h-16 text-[#ffc700] dark:text-yellow-500 group-hover:scale-110 transition-transform ${playIconClassName}`} fill="currentColor" />
          </div>
        )}
      </button>
    </>
  )
}
