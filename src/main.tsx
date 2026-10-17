import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './styles/fonts.css';
import './styles/index.css';
import { App } from './App';
import { applyTheme, useUi } from './app/ui-store';

applyTheme(useUi.getState().theme);
registerSW({ immediate: true });

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element.');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
