/**
 * API Client
 * 
 * Base fetch wrapper for backend communication.
 */

// Types from backend (simplified for frontend)
export interface PodcastRequest {
  input: string;
  type?: 'url' | 'title';
}

export interface PodcastResponse {
  id: string;
  audioUrl: string;
  scriptUrl: string;
  durationSeconds: number;
  article: {
    title: string;
    url: string;
  };
  speakers: string[];
  createdAt: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  uptime: number;
  checks: {
    ffmpeg: 'ok' | 'error';
    outputDir: 'ok' | 'error';
  };
}

export interface ProgressEvent {
  stage: 'fetch' | 'generate_script' | 'synthesize_audio' | 'stitch_audio';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
  progress?: number;
}

/**
 * API base URL
 * In development, Vite proxy forwards /api to backend
 * In production, same origin serves both
 */
const API_BASE = '/api';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(response: ErrorResponse, statusCode: number) {
    super(response.message);
    this.name = 'ApiError';
    this.code = response.error;
    this.statusCode = statusCode;
    this.details = response.details;
  }
}

/**
 * Make a fetch request with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new ApiError(data as ErrorResponse, response.status);
  }
  
  return data as T;
}

/**
 * Health check - GET /api/health
 */
export async function checkHealth(): Promise<HealthResponse> {
  return fetchApi<HealthResponse>('/health');
}

/**
 * Generate podcast - POST /api/podcast
 */
export async function generatePodcast(
  input: string,
  type?: 'url' | 'title'
): Promise<PodcastResponse>;
export async function generatePodcast(
  request: PodcastRequest
): Promise<PodcastResponse>;
export async function generatePodcast(
  inputOrRequest: string | PodcastRequest,
  type?: 'url' | 'title'
): Promise<PodcastResponse> {
  const request: PodcastRequest = typeof inputOrRequest === 'string'
    ? { input: inputOrRequest, type }
    : inputOrRequest;
    
  return fetchApi<PodcastResponse>('/podcast', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Generate podcast with SSE progress - POST /api/podcast/stream
 * Returns an EventSource for real-time progress updates
 */
export function streamPodcastGeneration(
  request: PodcastRequest,
  onProgress: (event: ProgressEvent) => void,
  onComplete: (response: PodcastResponse) => void,
  onError: (error: Error) => void
): () => void {
  // Create AbortController for cleanup
  const abortController = new AbortController();
  
  // Make SSE request
  fetch(`${API_BASE}/podcast/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.json();
        throw new ApiError(error, response.status);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete events from buffer
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const eventMatch = line.match(/^event: (\w+)\ndata: (.+)$/s);
          if (!eventMatch) continue;
          
          const [, eventType, eventData] = eventMatch;
          const data = JSON.parse(eventData);
          
          if (eventType === 'progress') {
            onProgress(data as ProgressEvent);
          } else if (eventType === 'complete') {
            onComplete(data as PodcastResponse);
          } else if (eventType === 'error') {
            onError(new ApiError(data, 500));
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });
  
  // Return cleanup function
  return () => {
    abortController.abort();
  };
}

/**
 * Get podcast metadata - GET /api/podcast/:id
 */
export async function getPodcast(id: string): Promise<PodcastResponse> {
  return fetchApi<PodcastResponse>(`/podcast/${encodeURIComponent(id)}`);
}

/**
 * Get audio URL for a podcast
 */
export function getAudioUrl(id: string): string {
  return `${API_BASE}/podcast/${encodeURIComponent(id)}/audio`;
}

/**
 * Get script URL for a podcast
 */
export function getScriptUrl(id: string): string {
  return `${API_BASE}/podcast/${encodeURIComponent(id)}/script`;
}

/**
 * Download audio file
 */
export async function downloadAudio(id: string, filename?: string): Promise<void> {
  const url = getAudioUrl(id);
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error, response.status);
  }
  
  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename || `${id}.mp3`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(downloadUrl);
}

