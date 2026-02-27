'use client'

import { X } from 'lucide-react'

interface VideoPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  videoTitle?: string
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

export function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  videoTitle,
}: VideoPlayerModalProps) {
  if (!isOpen) return null

  const isYouTube = isYouTubeUrl(videoUrl)
  const youtubeVideoId = isYouTube ? getYouTubeVideoId(videoUrl) : null
  const embedUrl = youtubeVideoId 
    ? `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`
    : null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-2 sm:p-4 fade-in"
      onClick={onClose}
    >
      <div 
        className="relative max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-8 sm:-top-10 right-0 sm:right-2 text-white hover:text-yellow-500 transition z-10 p-2 touch-manipulation"
          aria-label="Close video"
        >
          <X className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
        
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          {videoTitle && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800">
              <h3 className="text-base sm:text-xl font-semibold text-white break-words pr-8 sm:pr-0">{videoTitle}</h3>
            </div>
          )}
          <div className="relative aspect-video bg-black">
            {isYouTube && embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={videoTitle || 'YouTube video player'}
              />
            ) : (
              <video
                key={videoUrl} // Force re-render when video changes
                src={videoUrl}
                controls
                autoPlay
                className="w-full h-full max-h-[calc(95vh-60px)] sm:max-h-[calc(90vh-80px)] object-contain"
                playsInline
                onEnded={() => {
                  // Video ended, user can close or it will stay open
                }}
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
