'use client'

import { useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { CheckCircle2, Circle, Clock, User, FileText, Sparkles } from 'lucide-react'
import type { FeedbackSubmission } from '@/types/database'

interface FeedbackProgressTrackerProps {
  submission: FeedbackSubmission
  className?: string
}

type ProgressStep = {
  key: string
  label: string
  status: 'completed' | 'current' | 'upcoming'
  icon: typeof CheckCircle2
  timestamp?: string
  description?: string
}

export function FeedbackProgressTracker({ submission, className = '' }: FeedbackProgressTrackerProps) {
  const steps = useMemo(() => {
    const stepList: ProgressStep[] = []
    const now = new Date()
    const created = new Date(submission.created_at)
    const updated = new Date(submission.updated_at)
    const completed = submission.completed_at ? new Date(submission.completed_at) : null

    // Step 1: Submitted
    stepList.push({
      key: 'submitted',
      label: 'Submitted',
      status: 'completed',
      icon: FileText,
      timestamp: format(created, 'MMM d, h:mm a'),
      description: 'Your video has been submitted',
    })

    // Step 2: Payment (if needed)
    if (submission.payment_status === 'completed') {
      stepList.push({
        key: 'payment',
        label: 'Payment',
        status: 'completed',
        icon: CheckCircle2,
        timestamp: 'Completed',
        description: 'Payment processed',
      })
    } else if (submission.payment_status === 'pending' || submission.payment_status === 'processing') {
      stepList.push({
        key: 'payment',
        label: 'Payment',
        status: 'current',
        icon: Circle,
        timestamp: submission.payment_status === 'processing' ? 'Processing' : 'Pending',
        description: submission.payment_status === 'processing'
          ? 'Payment is being processed'
          : 'Waiting for payment confirmation',
      })
    } else if (submission.payment_status === 'failed') {
      stepList.push({
        key: 'payment',
        label: 'Payment',
        status: 'current',
        icon: Circle,
        timestamp: 'Failed',
        description: 'Payment failed - please retry',
      })
    }

    // Step 3: Assigned
    if (submission.status === 'pending') {
      stepList.push({
        key: 'assigned',
        label: 'Assigned to Mentor',
        status: 'upcoming',
        icon: Circle,
        description: 'Waiting for mentor assignment',
      })
    } else if (submission.status === 'assigned' || submission.status === 'in_progress' || submission.status === 'completed') {
      stepList.push({
        key: 'assigned',
        label: 'Assigned to Mentor',
        status: 'completed',
        icon: User,
        timestamp: submission.mentor_id ? 'Assigned' : undefined,
        description: submission.mentor_id ? 'Mentor is reviewing your video' : 'Waiting for mentor assignment',
      })
    }

    // Step 4: In Progress
    if (submission.status === 'completed') {
      stepList.push({
        key: 'in_progress',
        label: 'In Progress',
        status: 'completed',
        icon: Clock,
        description: 'Feedback being prepared',
      })
    } else if (submission.status === 'in_progress') {
      stepList.push({
        key: 'in_progress',
        label: 'In Progress',
        status: 'current',
        icon: Clock,
        timestamp: `Started ${formatDistanceToNow(updated, { addSuffix: true })}`,
        description: 'Mentor is providing feedback',
      })
    } else {
      stepList.push({
        key: 'in_progress',
        label: 'In Progress',
        status: 'upcoming',
        icon: Circle,
        description: 'Mentor will start reviewing soon',
      })
    }

    // Step 5: Completed
    if (submission.status === 'completed') {
      stepList.push({
        key: 'completed',
        label: 'Feedback Ready',
        status: 'completed',
        icon: Sparkles,
        timestamp: completed ? format(completed, 'MMM d, h:mm a') : undefined,
        description: 'Your feedback is ready to view!',
      })
    } else {
      stepList.push({
        key: 'completed',
        label: 'Feedback Ready',
        status: 'upcoming',
        icon: Circle,
        description: 'Almost there!',
      })
    }

    return stepList
  }, [submission])

  const currentStepIndex = steps.findIndex(step => step.status === 'current')
  const completedSteps = steps.filter(step => step.status === 'completed').length
  const totalSteps = steps.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  // Calculate estimated time remaining
  const estimatedTimeRemaining = useMemo(() => {
    if (submission.status === 'completed') return null
    
    const created = new Date(submission.created_at)
    const now = new Date()
    const elapsed = now.getTime() - created.getTime()
    const elapsedHours = elapsed / (1000 * 60 * 60)
    
    // Average completion time: ~24-48 hours
    // Show estimate based on current status
    if (submission.status === 'pending') {
      return '24-48 hours'
    } else if (submission.status === 'assigned') {
      return '12-24 hours'
    } else if (submission.status === 'in_progress') {
      return '2-6 hours'
    }
    
    return null
  }, [submission.status, submission.created_at])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-[#272727] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#ffc700] to-[#e6b300] transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-[#d9d9d9]/70">
          <span>{completedSteps} of {totalSteps} steps</span>
          {estimatedTimeRemaining && (
            <span className="text-[#ffc700]">Est. {estimatedTimeRemaining} remaining</span>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="relative space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isCompleted = step.status === 'completed'
          const isCurrent = step.status === 'current'
          const isUpcoming = step.status === 'upcoming'
          const isLast = index === steps.length - 1

          return (
            <div key={step.key} className="relative flex items-start gap-3">
              {/* Connector Line */}
              {!isLast && (
                <div
                  className={`absolute left-4 top-8 w-0.5 h-8 transition-all duration-300 ${
                    isCompleted ? 'bg-green-500' : 'bg-[#272727]'
                  }`}
                />
              )}

              {/* Icon */}
              <div
                className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-900/30 border-2 border-green-500'
                    : isCurrent
                    ? 'bg-[#ffc700]/20 border-2 border-[#ffc700] animate-pulse'
                    : 'bg-[#272727] border-2 border-[#272727]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isCompleted
                      ? 'text-green-400'
                      : isCurrent
                      ? 'text-[#ffc700]'
                      : 'text-[#d9d9d9]/30'
                  }`}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-sm font-medium ${
                      isCompleted
                        ? 'text-green-400'
                        : isCurrent
                        ? 'text-[#ffc700]'
                        : 'text-[#d9d9d9]/50'
                    }`}
                  >
                    {step.label}
                  </h4>
                  {step.timestamp && (
                    <span className="text-xs text-[#d9d9d9]/50 whitespace-nowrap">
                      {step.timestamp}
                    </span>
                  )}
                </div>
                {step.description && (
                  <p
                    className={`text-xs mt-0.5 ${
                      isCompleted || isCurrent
                        ? 'text-[#d9d9d9]'
                        : 'text-[#d9d9d9]/50'
                    }`}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Status Summary */}
      {submission.status !== 'completed' && (
        <div className="mt-4 p-3 bg-[#272727]/50 border border-[#272727] rounded-lg">
          <p className="text-xs text-[#d9d9d9]">
            <span className="font-medium text-[#ffc700]">Current Status:</span>{' '}
            {submission.status === 'pending' && 'Waiting for mentor assignment'}
            {submission.status === 'assigned' && 'Mentor has been assigned and will start reviewing soon'}
            {submission.status === 'in_progress' && 'Mentor is actively reviewing your video and preparing feedback'}
          </p>
        </div>
      )}
    </div>
  )
}
