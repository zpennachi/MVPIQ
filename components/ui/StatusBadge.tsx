'use client'

import { Clock, CheckCircle, AlertCircle, DollarSign, XCircle } from 'lucide-react'

interface StatusBadgeProps {
  status: string
  type?: 'submission' | 'payment'
  className?: string
}

export function StatusBadge({ status, type = 'submission', className = '' }: StatusBadgeProps) {
  const getStatusConfig = () => {
    if (type === 'payment') {
      switch (status) {
        case 'completed':
          return {
            color: 'bg-green-900/30 text-green-400 border-green-800',
            icon: CheckCircle,
            label: 'Paid',
          }
        case 'processing':
          return {
            color: 'bg-blue-900/30 text-blue-400 border-blue-800',
            icon: Clock,
            label: 'Processing',
          }
        case 'failed':
          return {
            color: 'bg-red-900/30 text-red-400 border-red-800',
            icon: XCircle,
            label: 'Failed',
          }
        default:
          return {
            color: 'bg-[#272727] text-[#d9d9d9] border-[#272727]',
            icon: Clock,
            label: 'Pending',
          }
      }
    }

    // Submission status
    switch (status) {
      case 'completed':
        return {
          color: 'bg-green-900/30 text-green-400 border-green-800',
          icon: CheckCircle,
          label: 'Completed',
        }
      case 'in_progress':
      case 'assigned':
        return {
          color: 'bg-[#ffc700]/20 text-[#ffc700] border-[#ffc700]/40',
          icon: AlertCircle,
          label: status === 'assigned' ? 'Assigned' : 'In Progress',
        }
      case 'pending':
        return {
          color: 'bg-[#272727] text-[#d9d9d9] border-[#272727]',
          icon: Clock,
          label: 'Pending Review',
        }
      default:
        return {
          color: 'bg-[#272727] text-[#d9d9d9] border-[#272727]',
          icon: Clock,
          label: status.replace('_', ' '),
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.color} ${className}`}
      title={config.label}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}
