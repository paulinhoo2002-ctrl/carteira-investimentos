import { App } from './App';
import { createModernFixedIncomeRuntime } from './bootstrap/modernFixedIncomeRuntime';
import { createModernIncomeRuntime } from './bootstrap/modernIncomeRuntime';
import { createModernReportsRuntime } from './bootstrap/modernReportsRuntime';
import { mountModernApp } from './bootstrap/mountModernApp';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root nao encontrado.');
}

const modernReportsRuntime = createModernReportsRuntime();
const modernFixedIncomeRuntime = createModernFixedIncomeRuntime();
const modernIncomeRuntime = createModernIncomeRuntime();

mountModernApp({
  rootElement,
  reportsAdapter: modernReportsRuntime.reportsAdapter,
  fixedIncomeAdapter: modernFixedIncomeRuntime.fixedIncomeAdapter,
  incomeAdapter: modernIncomeRuntime.incomeAdapter,
  AppComponent: App,
  incomeRefreshController: modernIncomeRuntime.incomeRefreshController,
});
