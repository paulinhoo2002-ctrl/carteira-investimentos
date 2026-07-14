import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { createModernReportsRuntime } from './bootstrap/modernReportsRuntime';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root nao encontrado.');
}

const modernReportsRuntime = createModernReportsRuntime();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App reportsAdapter={modernReportsRuntime.reportsAdapter} />
  </React.StrictMode>,
);
