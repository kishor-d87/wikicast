import { useState } from 'react';
import { generatePodcast } from '../services/api';

export type GenerationState = 'idle' | 'loading' | 'success' | 'error';

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

export function usePodcastGeneration() {
  const [state, setState] = useState<GenerationState>('idle');
  const [result, setResult] = useState<PodcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async (input: string, type: 'url' | 'title') => {
    setState('loading');
    setError(null);
    setResult(null);

    try {
      const response = await generatePodcast(input, type);
      
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate podcast';
      setError(errorMessage);
      setState('error');
    }
  };

  const reset = () => {
    setState('idle');
    setResult(null);
    setError(null);
  };

  return {
    state,
    result,
    error,
    generate,
    reset,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
  };
}

