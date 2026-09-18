import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StoreProvider } from './store/useStore.ts';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemen root aplikasi tidak ditemukan.');
}

createRoot(rootElement).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
