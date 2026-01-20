'use client'

interface LoadingSkeletonProps {
  lines?: number
  className?: string
}

export function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-[#272727] rounded w-full" style={{ maxWidth: i === 0 ? '100%' : i === 1 ? '75%' : '50%' }} />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-black border border-[#272727] rounded-lg p-6 animate-pulse">
      <div className="h-6 bg-[#272727] rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-[#272727] rounded w-full"></div>
        <div className="h-4 bg-[#272727] rounded w-5/6"></div>
        <div className="h-4 bg-[#272727] rounded w-4/6"></div>
      </div>
    </div>
  )
}
