/**
 * M1471 — Memory Profiling & Leak Detection
 * Monitoramento de memória, detecção de vazamentos, heap snapshots
 */
(function (global) {
  'use strict';

  const MemoryProfiler = {
    snapshots: [],
    observers: [],
    intervalId: null,
    threshold: 50 * 1024 * 1024, // 50MB default threshold

    start(intervalMs = 30000) {
      if (this.intervalId) return;
      this.intervalId = setInterval(() => this.takeSnapshot(), intervalMs);
      console.log('[MemoryProfiler] Started monitoring every ' + intervalMs + 'ms');
    },

    stop() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        console.log('[MemoryProfiler] Stopped monitoring');
      }
    },

    takeSnapshot() {
      if (!globalThis.performance || !performance.memory) {
        console.warn('[MemoryProfiler] performance.memory not available');
        return null;
      }

      const mem = performance.memory;
      const snapshot = {
        timestamp: Date.now(),
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
        usagePercent: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100
      };

      this.snapshots.push(snapshot);

      // Keep only last 100 snapshots
      if (this.snapshots.length > 100) {
        this.snapshots.shift();
      }

      // Check threshold
      if (mem.usedJSHeapSize > this.threshold) {
        this.notifyObservers('threshold_exceeded', snapshot);
      }

      // Detect potential leak (steady growth over last 10 snapshots)
      if (this.snapshots.length >= 10) {
        const recent = this.snapshots.slice(-10);
        const growth = recent[recent.length - 1].usedJSHeapSize - recent[0].usedJSHeapSize;
        const growthRate = growth / recent[0].usedJSHeapSize;
        if (growthRate > 0.2) { // 20% growth over 10 intervals
          this.notifyObservers('potential_leak', { growthRate, snapshots: recent });
        }
      }

      return snapshot;
    },

    getSnapshots() {
      return [...this.snapshots];
    },

    getCurrentMemory() {
      if (!globalThis.performance || !performance.memory) return null;
      const mem = performance.memory;
      return {
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
        usagePercent: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100
      };
    },

    setThreshold(bytes) {
      this.threshold = bytes;
    },

    onThresholdExceeded(callback) {
      this.observers.push({ type: 'threshold_exceeded', callback });
    },

    onPotentialLeak(callback) {
      this.observers.push({ type: 'potential_leak', callback });
    },

    notifyObservers(event, data) {
      this.observers
        .filter(o => o.type === event)
        .forEach(o => {
          try { o.callback(data); } catch (e) { console.error('[MemoryProfiler] Observer error:', e); }
        });
    },

    // Force garbage collection hint (if available)
    gc() {
      if (globalThis.gc) {
        globalThis.gc();
        console.log('[MemoryProfiler] GC hint called');
      }
    },

    // Generate memory report
    generateReport() {
      const current = this.getCurrentMemory();
      const snapshots = this.getSnapshots();

      if (snapshots.length < 2) {
        return { current, trend: 'insufficient_data', snapshotsCount: snapshots.length };
      }

      const first = snapshots[0];
      const last = snapshots[snapshots.length - 1];
      const timeSpan = (last.timestamp - first.timestamp) / 1000 / 60; // minutes
      const memoryGrowth = last.usedJSHeapSize - first.usedJSHeapSize;
      const growthPerMinute = timeSpan > 0 ? memoryGrowth / timeSpan : 0;

      let trend = 'stable';
      if (growthPerMinute > 1024 * 1024) trend = 'growing';
      else if (growthPerMinute < -1024 * 1024) trend = 'shrinking';

      return {
        current,
        trend,
        growthPerMinute: Math.round(growthPerMinute),
        timeSpanMinutes: Math.round(timeSpan * 100) / 100,
        snapshotsCount: snapshots.length,
        peakUsage: Math.max(...snapshots.map(s => s.usedJSHeapSize)),
        avgUsage: Math.round(snapshots.reduce((sum, s) => sum + s.usedJSHeapSize, 0) / snapshots.length)
      };
    }
  };

  // Auto-start in development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    MemoryProfiler.start(60000); // 1 minute intervals
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = MemoryProfiler;
  if (typeof global !== 'undefined') global.MemoryProfiler = MemoryProfiler;
})(typeof window !== 'undefined' ? window : globalThis);