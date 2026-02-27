/**
 * Centralized error handling utilities
 */

import { NextResponse } from 'next/server'
import { logger } from './logger'

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      404,
      'NOT_FOUND'
    )
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

/**
 * Handle errors in API routes and return appropriate responses
 */
export function handleApiError(error: unknown): NextResponse {
  // Known application errors
  if (error instanceof AppError) {
    logger.error('Application error', error, {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    })

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(process.env.NODE_ENV === 'development' && error.details
          ? { details: error.details }
          : {}),
      },
      { status: error.statusCode }
    )
  }

  // Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    logger.error('Validation error', error)
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        ...(process.env.NODE_ENV === 'development'
          ? { details: error }
          : {}),
      },
      { status: 400 }
    )
  }

  // Standard Error objects
  if (error instanceof Error) {
    logger.error('Unexpected error', error, {
      message: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? error.message
          : 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }

  // Unknown error type
  logger.error('Unknown error', undefined, { error })
  return NextResponse.json(
    {
      error: 'An unknown error occurred',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 }
  )
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
