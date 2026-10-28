import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/permanent-marker';
import './styles/tokens.css';
import './styles/base.css';
import App from './App';
import { TooltipProvider } from './components/ui/Tooltip';
import { initSocket } from './lib/socket';

initSocket();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

createRoot(container).render(
  <StrictMode>
    <TooltipProvider delayDuration={280}>
      <App />
    </TooltipProvider>
  </StrictMode>
);
