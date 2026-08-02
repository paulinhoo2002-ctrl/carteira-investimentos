import { App } from './App';
import { createModernContributionsRuntime } from './bootstrap/modernContributionsRuntime';
import { createModernFixedIncomeRuntime } from './bootstrap/modernFixedIncomeRuntime';
import { createModernGoalsRuntime } from './bootstrap/modernGoalsRuntime';
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
const modernContributionsRuntime = createModernContributionsRuntime();
const modernIncomeRuntime = createModernIncomeRuntime();
const modernGoalsRuntime = createModernGoalsRuntime();

mountModernApp({
  rootElement,
  reportsAdapter: modernReportsRuntime.reportsAdapter,
  fixedIncomeAdapter: modernFixedIncomeRuntime.fixedIncomeAdapter,
  contributionsAdapter: modernContributionsRuntime.contributionsAdapter,
  incomeAdapter: modernIncomeRuntime.incomeAdapter,
  goalsAdapter: modernGoalsRuntime.goalsAdapter,
  AppComponent: App,
  contributionsRefreshController: modernContributionsRuntime.contributionsRefreshController,
  incomeRefreshController: modernIncomeRuntime.incomeRefreshController,
  goalsRefreshController: modernGoalsRuntime.goalsRefreshController,
});
