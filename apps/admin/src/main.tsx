import { I18nProvider } from '@disa/i18n';
import { loadAdminLocale } from '@disa/i18n/admin';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root is missing from index.html');

void loadAdminLocale().then((initial) => {
  createRoot(container).render(
    <StrictMode>
      <I18nProvider initial={initial}>
        <App />
      </I18nProvider>
    </StrictMode>,
  );
});
