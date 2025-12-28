import { useState, useRef } from 'react';
import { streamPodcastGeneration, ProgressEvent } from '../services/api';

export type GenerationState = 'idle' | 'loading' | 'success' | 'error';
export type ProgressStage = 'fetch' | 'generate_script' | 'synthesize_audio' | 'stitch_audio';
export type ProgressStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PodcastResult {
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

export interface ProgressState {
  stage: ProgressStage | null;
  status: ProgressStatus;
  message: string;
}

export function usePodcastGeneration() {
  const [state, setState] = useState<GenerationState>('idle');
  const [result, setResult] = useState<PodcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>({
    stage: null,
    status: 'pending',
    message: '',
  });
  
  const cleanupRef = useRef<(() => void) | null>(null);

  const generate = async (input: string, type: 'url' | 'title') => {
    // Clean up any existing connection
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    setState('loading');
    setError(null);
    setResult(null);
    setProgress({
      stage: null,
      status: 'pending',
      message: '',
    });

    try {
      cleanupRef.current = streamPodcastGeneration(
        { input, type },
        // onProgress
        (event: ProgressEvent) => {
          setProgress({
            stage: event.stage,
            status: event.status,
            message: event.message,
          });
        },
        // onComplete
        (response) => {
          setResult({
            id: response.id,
            audioUrl: response.audioUrl,
            scriptUrl: response.scriptUrl,
            durationSeconds: response.durationSeconds,
            article: response.article,
            speakers: response.speakers,
            createdAt: response.createdAt,
          });
          setState('success');
          cleanupRef.current = null;
        },
        // onError
        (err) => {
          const errorMessage = err instanceof Error ? err.message : 'Failed to generate podcast';
          setError(errorMessage);
          setState('error');
          cleanupRef.current = null;
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate podcast';
      setError(errorMessage);
      setState('error');
    }
  };

  const reset = () => {
    // Clean up any existing connection
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    setState('idle');
    setResult(null);
    setError(null);
    setProgress({
      stage: null,
      status: 'pending',
      message: '',
    });
  };

  return {
    state,
    result,
    error,
    progress,
    generate,
    reset,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
  };
}

