import { useState } from 'react';

interface InputFormProps {
  onSubmit: (input: string, type: 'url' | 'title') => void;
  loading: boolean;
}

export function InputForm({ onSubmit, loading }: InputFormProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate input
    if (!input.trim()) {
      setError('Please enter a Wikipedia URL');
      return;
    }

    // Basic URL validation
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

    onSubmit(input.trim(), 'url');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    setError('');
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Field */}
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            disabled={loading}
            placeholder="https://en.wikipedia.org/wiki/..."
            className={`w-full px-4 py-3 text-lg bg-slate-700 text-white placeholder-slate-400 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-podcast-500 disabled:bg-slate-800 disabled:cursor-not-allowed transition-colors ${
              error ? 'border-red-500' : 'border-slate-600'
            }`}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-podcast-500"></div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-400 text-sm mt-2 px-2">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-full bg-podcast-600 hover:bg-podcast-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-500"
        >
          {loading ? 'Generating Podcast...' : '🎙️ Generate Podcast'}
        </button>
      </form>

      {/* Examples */}
      <div className="mt-6 text-sm text-slate-400">
        <p className="font-medium mb-2">Example:</p>
        <ul className="space-y-1">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>https://en.wikipedia.org/wiki/Quantum_Computing</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

