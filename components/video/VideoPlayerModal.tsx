'use client'

import { X } from 'lucide-react'

interface VideoPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  videoTitle?: string
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  videoTitle,
}: VideoPlayerModalProps) {
  if (!isOpen) return null

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
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full max-h-[calc(95vh-60px)] sm:max-h-[calc(90vh-80px)] object-contain"
              playsInline
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </div>
  )
}
