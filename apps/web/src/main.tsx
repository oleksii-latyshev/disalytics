import { I18nProvider, loadInitialLocale } from '@disa/i18n';
import { StrictMode } from 'react';
import './styles.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

const start = async () => {
  const initial = await loadInitialLocale();

  createRoot(container).render(
    <StrictMode>
      <I18nProvider initial={initial}>
        <App />
      </I18nProvider>
    </StrictMode>,
  );
};

void start();
