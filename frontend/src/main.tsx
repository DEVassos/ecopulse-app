// Os estilos globais vêm antes do App: eles declaram a ordem das camadas de CSS
// (theme, base, components, utilities) antes de qualquer componente usar uma delas.
import './styles/global.css';
import './styles/layout.css';
import './styles/controls.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Elemento #root não encontrado em index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
