import { I18nProvider, loadInitialLocale } from '@disa/i18n';
import { MotionProvider } from '@disa/ui';
import { StrictMode } from 'react';
import './styles.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

const start = async () => {
  const { locale, messages } = await loadInitialLocale();

  createRoot(container).render(
    <StrictMode>
      <I18nProvider locale={locale} messages={messages}>
        <MotionProvider>
          <App />
        </MotionProvider>
      </I18nProvider>
    </StrictMode>,
  );
};

void start();
