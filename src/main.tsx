import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './app/router';
import { Providers } from './app/providers';
import './styles/index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('ComputeAtlas root mount node was not found.');
}

createRoot(root).render(
  <StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </StrictMode>,
);
