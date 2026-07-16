import { App } from './App';
import { createModernFixedIncomeRuntime } from './bootstrap/modernFixedIncomeRuntime';
import { createModernReportsRuntime } from './bootstrap/modernReportsRuntime';
import { mountModernApp } from './bootstrap/mountModernApp';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root nao encontrado.');
}

const modernReportsRuntime = createModernReportsRuntime();
const modernFixedIncomeRuntime = createModernFixedIncomeRuntime();

mountModernApp({
  rootElement,
  reportsAdapter: modernReportsRuntime.reportsAdapter,
  fixedIncomeAdapter: modernFixedIncomeRuntime.fixedIncomeAdapter,
  AppComponent: App,
});
