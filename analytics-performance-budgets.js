/**
 * M1491 — Performance Budgets & CI Integration
 * Orçamentos de performance, Lighthouse CI, alertas de regressão
 */
(function (global) {
  'use strict';

  const PerformanceBudgets = {
    // Default budgets (can be customized per project)
    defaults: {
      // Lighthouse budgets
      lighthouse: {
        performance: 90,
        accessibility: 95,
        bestPractices: 90,
        seo: 90,
        pwa: 80
      },
      // Custom metrics budgets
      metrics: {
        // Core Web Vitals
        LCP: 2500,
        FID: 100,
        CLS: 0.1,
        FCP: 1800,
        TTFB: 600,
        TBT: 200,
        TTI: 3800,

        // Bundle sizes (bytes)
        maxTotalBundle: 500 * 1024,
        maxInitialJS: 170 * 1024,
        maxCSS: 50 * 1024,
        maxFontSize: 100 * 1024,
        maxImageSize: 500 * 1024,

        // Resource counts
        maxRequests: 50,
        maxThirdPartyRequests: 10,

        // Memory
        maxJSHeapSize: 50 * 1024 * 1024,

        // Timing budgets (ms)
        maxDOMContentLoaded: 2000,
        maxLoad: 4000
      }
    },

    // Merge user config with defaults
    getBudgets(userConfig = {}) {
      return {
        lighthouse: { ...this.defaults.lighthouse, ...userConfig.lighthouse },
        metrics: { ...this.defaults.metrics, ...userConfig.metrics }
      };
    },

    // Check if metrics meet budgets
    checkBudgets(metrics, budgets = this.getBudgets()) {
      const results = {
        passed: true,
        violations: [],
        warnings: [],
        summary: { passed: 0, failed: 0, warnings: 0 }
      };

      const lighthouseBudgets = budgets.lighthouse || this.defaults.lighthouse;
      const metricBudgets = budgets.metrics || this.defaults.metrics;

      // Check Lighthouse scores
      if (metrics.lighthouse) {
        Object.entries(lighthouseBudgets).forEach(([category, budget]) => {
          const actual = metrics.lighthouse[category];
          if (actual !== undefined) {
            if (actual < budget) {
              results.passed = false;
              results.violations.push({
                category: 'lighthouse',
                metric: category,
                budget,
                actual,
                severity: 'error'
              });
              results.summary.failed++;
            } else {
              results.summary.passed++;
            }
          }
        });
      }

      // Check Core Web Vitals
      const cwvMetrics = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'TBT', 'TTI'];
      cwvMetrics.forEach(metric => {
        const budget = metricBudgets[metric];
        const actual = metrics[metric];
        if (actual !== undefined && budget !== undefined) {
          const passed = actual <= budget;
          if (!passed) {
            results.passed = false;
            results.violations.push({
              category: 'core-web-vitals',
              metric,
              budget,
              actual,
              severity: metric === 'LCP' || metric === 'CLS' ? 'error' : 'warning'
            });
            results.summary.failed++;
          } else {
            results.summary.passed++;
          }
        }
      });

      // Check bundle sizes
      const sizeMetrics = [
        { key: 'totalBundle', budget: metricBudgets.maxTotalBundle, label: 'Total Bundle' },
        { key: 'initialJS', budget: metricBudgets.maxInitialJS, label: 'Initial JS' },
        { key: 'cssSize', budget: metricBudgets.maxCSS, label: 'CSS' },
        { key: 'fontSize', budget: metricBudgets.maxFontSize, label: 'Fonts' },
        { key: 'imageSize', budget: metricBudgets.maxImageSize, label: 'Images' }
      ];

      sizeMetrics.forEach(({ key, budget, label }) => {
        const actual = metrics[key];
        if (actual !== undefined && budget !== undefined) {
          const passed = actual <= budget;
          if (!passed) {
            results.passed = false;
            results.violations.push({
              category: 'bundle-size',
              metric: key,
              label,
              budget,
              actual,
              severity: 'warning'
            });
            results.summary.failed++;
          } else {
            results.summary.passed++;
          }
        }
      });

      // Check resource counts
      if (metrics.requestCount !== undefined) {
        const passed = metrics.requestCount <= metricBudgets.maxRequests;
        if (!passed) {
          results.passed = false;
          results.warnings.push({
            category: 'resources',
            metric: 'requestCount',
            budget: metricBudgets.maxRequests,
            actual: metrics.requestCount,
            severity: 'warning'
          });
          results.summary.warnings++;
        } else {
          results.summary.passed++;
        }
      }

      // Check third-party requests
      if (metrics.thirdPartyRequests !== undefined) {
        const passed = metrics.thirdPartyRequests <= metricBudgets.maxThirdPartyRequests;
        if (!passed) {
          results.warnings.push({
            category: 'third-party',
            metric: 'thirdPartyRequests',
            budget: metricBudgets.maxThirdPartyRequests,
            actual: metrics.thirdPartyRequests,
            severity: 'warning'
          });
          results.summary.warnings++;
        } else {
          results.summary.passed++;
        }
      }

      // Check memory
      if (metrics.jsHeapSize !== undefined) {
        const passed = metrics.jsHeapSize <= metricBudgets.maxJSHeapSize;
        if (!passed) {
          results.passed = false;
          results.violations.push({
            category: 'memory',
            metric: 'jsHeapSize',
            budget: metricBudgets.maxJSHeapSize,
            actual: metrics.jsHeapSize,
            severity: 'error'
          });
          results.summary.failed++;
        } else {
          results.summary.passed++;
        }
      }

      // Check timing budgets
      if (metrics.domContentLoaded !== undefined) {
        const passed = metrics.domContentLoaded <= metricBudgets.maxDOMContentLoaded;
        if (!passed) {
          results.warnings.push({
            category: 'timing',
            metric: 'domContentLoaded',
            budget: metricBudgets.maxDOMContentLoaded,
            actual: metrics.domContentLoaded,
            severity: 'warning'
          });
          results.summary.warnings++;
        } else {
          results.summary.passed++;
        }
      }

      if (metrics.load !== undefined) {
        const passed = metrics.load <= metricBudgets.maxLoad;
        if (!passed) {
          results.warnings.push({
            category: 'timing',
            metric: 'load',
            budget: metricBudgets.maxLoad,
            actual: metrics.load,
            severity: 'warning'
          });
          results.summary.warnings++;
        } else {
          results.summary.passed++;
        }
      }

      return results;
    },

    // Generate CI-friendly output (GitHub Actions annotations, etc.)
    generateCIReport(results, options = {}) {
      const { format = 'github-actions', includePassed = false } = options;
      
      let output = '';
      
      if (format === 'github-actions') {
        // GitHub Actions annotations
        results.violations.forEach(v => {
          const file = options.file || 'performance-budget';
          const line = options.line || 1;
          output += '::error file=' + file + ',line=' + line + ',title=Performance Budget Violation::' + (v.label || v.metric) + ': ' + v.actual + ' exceeds budget ' + v.budget + '\\n';
        });
        
        results.warnings.forEach(w => {
          const file = options.file || 'performance-budget';
          const line = options.line || 1;
          output += '::warning file=' + file + ',line=' + line + ',title=Performance Budget Warning::' + (w.label || w.metric) + ': ' + w.actual + ' exceeds budget ' + w.budget + '\\n';
        });

        if (results.passed) {
          output += '::notice file=performance-budget,line=1,title=Performance Budgets Passed::All ' + results.summary.passed + ' budgets passed\\n';
        } else {
          output += '::error file=performance-budget,line=1,title=Performance Budgets Failed::' + results.summary.failed + ' budgets failed, ' + results.summary.warnings + ' warnings\\n';
        }
      } else if (format === 'json') {
        output = JSON.stringify({
          passed: results.passed,
          summary: results.summary,
          violations: results.violations,
          warnings: results.warnings,
          timestamp: new Date().toISOString()
        }, null, 2);
      } else if (format === 'markdown') {
        output += '# Performance Budget Report\n\n';
        output += '**Status:** ' + (results.passed ? '✅ PASS' : '❌ FAIL') + '\\n\n';
        output += '**Summary:** ' + results.summary.passed + ' passed, ' + results.summary.failed + ' failed, ' + results.summary.warnings + ' warnings\n\n';
        
        if (results.violations.length > 0) {
          output += '## ❌ Violations\n\n';
          results.violations.forEach(v => {
            output += '- **' + (v.label || v.metric) + '**: ' + v.actual + ' (budget: ' + v.budget + ') - ' + v.severity + '\\n';
          });
          output += '\\n';
        }
        
        if (results.warnings.length > 0) {
          output += '## ⚠️ Warnings\n\n';
          results.warnings.forEach(w => {
            output += '- **' + (w.label || w.metric) + '**: ' + w.actual + ' (budget: ' + w.budget + ') - ' + w.severity + '\\n';
          });
          output += '\\n';
        }

        if (includePassed && results.summary.passed > 0) {
          output += '## ✅ Passed (' + results.summary.passed + ')\\n\\n';
        }
      }

      return output;
    },

    // Create budgets file template
    generateBudgetsFile() {
      const budgets = this.getBudgets();
      return JSON.stringify(budgets, null, 2);
    },

    // Parse Lighthouse JSON output
    parseLighthouseOutput(lhResult) {
      if (!lhResult || !lhResult.categories) return {};
      
      const categories = lhResult.categories;
      const audits = lhResult.audits || {};
      
      return {
        lighthouse: {
          performance: Math.round(categories.performance?.score * 100) || 0,
          accessibility: Math.round(categories.accessibility?.score * 100) || 0,
          'best-practices': Math.round(categories['best-practices']?.score * 100) || 0,
          seo: Math.round(categories.seo?.score * 100) || 0,
          pwa: Math.round(categories.pwa?.score * 100) || 0
        },
        LCP: audits['largest-contentful-paint']?.numericValue,
        FID: audits['max-potential-fid']?.numericValue || audits['first-input-delay']?.numericValue,
        CLS: audits['cumulative-layout-shift']?.numericValue,
        FCP: audits['first-contentful-paint']?.numericValue,
        TTFB: audits['server-response-time']?.numericValue || audits['time-to-first-byte']?.numericValue,
        TBT: audits['total-blocking-time']?.numericValue,
        TTI: audits['interactive']?.numericValue,
        // Additional metrics
        domContentLoaded: audits['dom-content-loaded']?.numericValue,
        load: audits['load-time']?.numericValue,
        requestCount: audits['resource-summary']?.details?.items?.length,
        totalBundle: audits['total-byte-weight']?.numericValue,
        initialJS: audits['script-boot-up-time']?.numericValue,
        cssSize: audits['unused-css-rules']?.numericValue,
        fontSize: audits['font-display']?.details?.items?.reduce((sum, item) => sum + (item.size || 0), 0),
        imageSize: audits['uses-optimized-images']?.details?.items?.reduce((sum, item) => sum + (item.size || 0), 0),
        jsHeapSize: audits['uses-long-cache-ttl']?.details?.items?.reduce((sum, item) => sum + (item.size || 0), 0),
        thirdPartyRequests: audits['third-party-summary']?.details?.items?.length
      };
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PerformanceBudgets;
  if (typeof global !== 'undefined') global.PerformanceBudgets = PerformanceBudgets;
})(typeof window !== 'undefined' ? window : globalThis);