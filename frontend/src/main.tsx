/**
 * Wikipedia Podcast Generator - Frontend Entry Point
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Check index.html for div#root.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

