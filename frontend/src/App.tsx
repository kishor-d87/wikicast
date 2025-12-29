/**
 * Wikipedia Podcast Generator - Main Application Component
 * 
 * Single-page interface for generating podcasts from Wikipedia articles.
 */

import { InputForm } from './components/InputForm';
import { AudioPlayer } from './components/AudioPlayer';
import { DownloadButton } from './components/DownloadButton';
import { ProgressTracker } from './components/ProgressTracker';
import { usePodcastGeneration } from './hooks/usePodcastGeneration';
import { getAudioUrl } from './services/api';

function App() {
  const { state, result, error, progress, generate, reset, isLoading, isSuccess, isError } = usePodcastGeneration();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-podcast-500 to-podcast-600 flex items-center justify-center">
              <svg 
                className="w-6 h-6 text-white" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                Wikipedia Podcast Generator
              </h1>
              <p className="text-sm text-slate-400">
                Transform articles into audio conversations
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Learn While You Listen
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Enter a Wikipedia article and get a 2-3 minute conversational podcast 
            with Nishi and Shyam discussing the key facts.
          </p>
        </div>

        {/* Input Form - Show when idle or error */}
        {(state === 'idle' || state === 'error') && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8 backdrop-blur-sm">
            <InputForm onSubmit={generate} loading={isLoading} />
            
            {/* Error Display */}
            {isError && error && (
              <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-red-400 font-semibold">Generation Failed</h3>
                    <p className="text-red-300 text-sm mt-1">{error}</p>
                    <button
                      onClick={reset}
                      className="mt-3 text-sm text-red-400 hover:text-red-300 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State with Progress Tracker */}
        {isLoading && (
          <ProgressTracker 
            currentStage={progress.stage}
            currentStatus={progress.status}
            error={error}
          />
        )}

        {/* Success State - Show Player and Download */}
        {isSuccess && result && (
          <div className="space-y-6">
            {/* Article Info */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {result.article.title}
                  </h3>
                  <a
                    href={result.article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-podcast-400 hover:text-podcast-300 underline"
                  >
                    View on Wikipedia →
                  </a>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>{Math.floor(result.durationSeconds / 60)}:{(result.durationSeconds % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
            </div>

            {/* Audio Player */}
            <AudioPlayer 
              audioUrl={getAudioUrl(result.id)} 
              title={result.article.title}
            />

            {/* Download Button */}
            <DownloadButton
              audioUrl={getAudioUrl(result.id)}
              podcastId={result.id}
              articleTitle={result.article.title}
            />

            {/* Generate Another Button */}
            <div className="text-center">
              <button
                onClick={reset}
                className="text-slate-400 hover:text-white transition-colors underline"
              >
                Generate Another Podcast
              </button>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <FeatureCard 
            icon="📖"
            title="Wikipedia Source"
            description="Content sourced directly from Wikipedia articles - no hallucinations"
          />
          <FeatureCard 
            icon="🎭"
            title="Two Hosts"
            description="Nishi and Shyam discuss topics in an engaging conversational format"
          />
          <FeatureCard 
            icon="⏱️"
            title="Quick & Focused"
            description="2-3 minute podcasts perfect for commuting or quick learning"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-center text-sm text-slate-500">
            Built with accuracy, predictability, and educational intent.
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Feature Card Component
 */
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 p-6">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}

export default App;

