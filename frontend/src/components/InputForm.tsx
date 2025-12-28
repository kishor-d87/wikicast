import { useState } from 'react';

interface InputFormProps {
  onSubmit: (input: string, type: 'url' | 'title') => void;
  loading: boolean;
}

export function InputForm({ onSubmit, loading }: InputFormProps) {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<'url' | 'title'>('url');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate input
    if (!input.trim()) {
      setError('Please enter a Wikipedia URL or article title');
      return;
    }

    // Auto-detect type if needed
    const detectedType = input.trim().startsWith('http') ? 'url' : 'title';
    const finalType = inputType === 'url' && detectedType === 'title' ? 'title' : inputType;

    // Basic URL validation for URL type
    if (finalType === 'url') {
      try {
        const url = new URL(input.trim());
        if (!url.hostname.includes('wikipedia.org')) {
          setError('Please enter a valid Wikipedia URL');
          return;
        }
      } catch {
        setError('Please enter a valid URL');
        return;
      }
    }

    onSubmit(input.trim(), finalType);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    setError('');

    // Auto-detect input type
    if (value.trim().startsWith('http')) {
      setInputType('url');
    } else if (value.trim().length > 0) {
      setInputType('title');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Type Toggle */}
        <div className="flex justify-center space-x-4 mb-4">
          <button
            type="button"
            onClick={() => setInputType('url')}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              inputType === 'url'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Wikipedia URL
          </button>
          <button
            type="button"
            onClick={() => setInputType('title')}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              inputType === 'title'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Article Title
          </button>
        </div>

        {/* Input Field */}
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            disabled={loading}
            placeholder={
              inputType === 'url'
                ? 'https://en.wikipedia.org/wiki/...'
                : 'Enter article title (e.g., "Albert Einstein")'
            }
            className={`w-full px-4 py-3 text-lg border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-600 text-sm mt-2 px-2">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating Podcast...' : '🎙️ Generate Podcast'}
        </button>
      </form>

      {/* Examples */}
      <div className="mt-6 text-sm text-gray-600">
        <p className="font-medium mb-2">Examples:</p>
        <ul className="space-y-1">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>URL: https://en.wikipedia.org/wiki/Quantum_Computing</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Title: Albert Einstein</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

