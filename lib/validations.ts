/**
 * Input validation schemas using Zod
 */

import { z } from 'zod'

// Video payment validation
export const videoPaymentSchema = z.object({
  videoId: z.string().uuid('Invalid video ID format'),
  mentorId: z.string().uuid('Invalid mentor ID format'),
})

// Submission payment validation
export const submissionPaymentSchema = z.object({
  submissionId: z.string().uuid('Invalid submission ID format'),
})

// Profile ensure validation
export const profileEnsureSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  email: z.string().email('Invalid email format'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['player', 'mentor', 'coach', 'admin', 'school']).optional().default('player'),
})

// Video URL submission validation
export const videoURLSubmissionSchema = z.object({
  videoUrl: z.string().url('Invalid video URL format'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  playerNumbers: z.string().max(100, 'Player numbers too long').optional(),
})

// Email notification validation
export const emailNotificationSchema = z.object({
  type: z.enum([
    'payment_confirmation',
    'submission_success',
    'feedback_ready',
    'new_submission',
    'pro_feedback_draft',
    'session_confirmation',
    'session_booking_notification',
    'session_reminder',
    'session_cancelled',
  ]),
  email: z.string().email('Invalid email format'),
  data: z.record(z.unknown()).optional(),
})

export type EmailType = z.infer<typeof emailNotificationSchema>['type']

// Session payment validation
export const sessionPaymentSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  mentorId: z.string().uuid('Invalid mentor ID format'),
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format'),
})

// Credit operations validation
export const creditGrantSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  amount: z.number().int().positive('Amount must be a positive integer'),
  reason: z.string().optional(),
})

export const creditUseSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  amount: z.number().int().positive('Amount must be a positive integer'),
  reason: z.string().optional(),
})

// Admin operations validation
export const adminUpdateUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  updates: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    role: z.enum(['player', 'mentor', 'coach', 'admin', 'school']).optional(),
  }),
})

export const adminResetPasswordSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})
