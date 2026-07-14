import { App } from './App';
import { createModernReportsRuntime } from './bootstrap/modernReportsRuntime';
import { mountModernApp } from './bootstrap/mountModernApp';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root nao encontrado.');
}

const modernReportsRuntime = createModernReportsRuntime();

mountModernApp({
  rootElement,
  reportsAdapter: modernReportsRuntime.reportsAdapter,
  AppComponent: App,
});
