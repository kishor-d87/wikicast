/**
 * Error Types and Handler
 * 
 * Defines application-specific error types and error handling utilities.
 * Error codes align with api.yaml specification.
 */

import type { ErrorCode, ErrorResponse } from '../types/index.js';
import type { Response } from 'express';

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to API error response
   */
  toResponse(): ErrorResponse {
    return {
      error: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Invalid input error (400)
 */
export class InvalidInputError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('INVALID_INPUT', message, 400, details);
    this.name = 'InvalidInputError';
  }
}

/**
 * Article not found error (404)
 */
export class ArticleNotFoundError extends AppError {
  constructor(identifier: string) {
    super(
      'ARTICLE_NOT_FOUND',
      `Could not find a Wikipedia article matching '${identifier}'`,
      404,
      { identifier }
    );
    this.name = 'ArticleNotFoundError';
  }
}

/**
 * Article too short error (400)
 */
export class ArticleTooShortError extends AppError {
  constructor(wordCount: number, minimumRequired: number) {
    super(
      'ARTICLE_TOO_SHORT',
      'The article does not contain enough content to generate a podcast',
      400,
      { wordCount, minimumRequired }
    );
    this.name = 'ArticleTooShortError';
  }
}

/**
 * Unsupported language error (400)
 */
export class UnsupportedLanguageError extends AppError {
  constructor(language: string) {
    super(
      'UNSUPPORTED_LANGUAGE',
      `Language '${language}' is not supported. Only English Wikipedia articles are supported.`,
      400,
      { language, supported: ['en'] }
    );
    this.name = 'UnsupportedLanguageError';
  }
}

/**
 * Generation failed error (500)
 */
export class GenerationFailedError extends AppError {
  constructor(stage: string, reason?: string) {
    super(
      'GENERATION_FAILED',
      reason || `Podcast generation failed during ${stage}`,
      500,
      { stage }
    );
    this.name = 'GenerationFailedError';
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(
      'SERVICE_UNAVAILABLE',
      `${service} is temporarily unavailable. Please try again later.`,
      503,
      { service }
    );
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Internal error (500)
 */
export class InternalError extends AppError {
  constructor(message: string = 'An unexpected error occurred') {
    super('INTERNAL_ERROR', message, 500);
    this.name = 'InternalError';
  }
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert any error to an AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return new InternalError(error.message);
  }
  
  return new InternalError(String(error));
}

/**
 * Send error response
 */
export function sendError(res: Response, error: unknown): void {
  const appError = toAppError(error);
  res.status(appError.statusCode).json(appError.toResponse());
}

/**
 * Express error handler middleware
 */
export function errorHandler(
  err: unknown,
  _req: unknown,
  res: Response,
  _next: unknown
): void {
  console.error('Error:', err);
  sendError(res, err);
}

/**
 * Wrap async route handler to catch errors
 */
export function asyncHandler<T>(
  fn: (req: T, res: Response, next: () => void) => Promise<void>
) {
  return (req: T, res: Response, next: () => void) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create error response object without throwing
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    error: code,
    message,
    ...(details && { details }),
  };
}

