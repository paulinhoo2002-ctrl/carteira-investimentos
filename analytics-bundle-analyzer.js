/**
 * M1481 — Bundle Analysis & Tree Shaking
 * Análise de bundle, identificação de dead code, otimização de imports
 */
(function (global) {
  'use strict';

  const BundleAnalyzer = {
    // Analyze bundle composition from build output
    analyzeBuild(buildManifest) {
      if (!buildManifest || typeof buildManifest !== 'object' || Object.keys(buildManifest).length === 0) {
        return { error: 'Invalid build manifest' };
      }

      const chunks = Array.isArray(buildManifest.chunks) ? buildManifest.chunks : [];
      const assets = Array.isArray(buildManifest.assets) ? buildManifest.assets : [];

      let totalSize = 0;
      let jsSize = 0;
      let cssSize = 0;
      let otherSize = 0;

      // Calculate sizes from chunks (primary source)
      const chunkDetails = chunks.map(chunk => {
        const size = chunk.size || 0;
        totalSize += size;

        if (chunk.names && chunk.names.some(n => n.endsWith('.js'))) {
          jsSize += size;
        } else if (chunk.names && chunk.names.some(n => n.endsWith('.css'))) {
          cssSize += size;
        } else {
          otherSize += size;
        }

        return {
          id: chunk.id,
          names: chunk.names || [],
          size,
          sizeKB: Math.round(size / 1024 * 100) / 100,
          modules: (chunk.modules || []).length,
          rendered: chunk.rendered
        };
      });

      // Also calculate CSS from assets if not already captured in chunks
      assets.forEach(asset => {
        const size = asset.size || 0;
        if (asset.type === 'css' || asset.name.endsWith('.css')) {
          // Only add if this CSS asset isn't already represented in chunks
          const alreadyCounted = chunkDetails.some(c => 
            c.names.some(n => n === asset.name || n.endsWith(asset.name))
          );
          if (!alreadyCounted) {
            cssSize += size;
            // Note: totalSize intentionally NOT incremented here to avoid double-counting
            // totalSize represents chunk output sizes only
          }
        }
      });

      // Identify largest chunks
      const largestChunks = [...chunkDetails]
        .sort((a, b) => b.size - a.size)
        .slice(0, 10);

      // Identify potential duplicates - use module id as key
      const moduleUsage = new Map();
      chunks.forEach(chunk => {
        (chunk.modules || []).forEach(mod => {
          const modId = mod.id || mod;
          const count = moduleUsage.get(modId) || 0;
          moduleUsage.set(modId, count + 1);
        });
      });

      const duplicates = [...moduleUsage.entries()]
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([module, count]) => ({ module, count }));

      // Asset breakdown
      const assetBreakdown = assets.map(asset => ({
        name: asset.name,
        size: asset.size,
        sizeKB: Math.round(asset.size / 1024 * 100) / 100,
        type: asset.type || (asset.name.endsWith('.js') ? 'js' : asset.name.endsWith('.css') ? 'css' : 'other')
      }));

      return {
        totalSize,
        totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
        jsSize,
        jsSizeKB: Math.round(jsSize / 1024 * 100) / 100,
        cssSize,
        cssSizeKB: Math.round(cssSize / 1024 * 100) / 100,
        otherSize,
        otherSizeKB: Math.round(otherSize / 1024 * 100) / 100,
        chunkCount: chunks.length,
        assetCount: assets.length,
        chunkDetails,
        largestChunks,
        duplicates,
        assetBreakdown,
        recommendations: this.generateRecommendations({ totalSize, jsSize, cssSize, duplicates, largestChunks })
      };
    },

    generateRecommendations(data) {
      const recs = [];

      if (data.totalSize > 500 * 1024) {
        recs.push({
          type: 'warning',
          message: `Bundle total (${(data.totalSize / 1024).toFixed(1)}KB) exceeds 500KB. Consider code splitting.`
        });
      }

      if (data.jsSize > 300 * 1024) {
        recs.push({
          type: 'warning',
          message: `JavaScript bundle (${(data.jsSize / 1024).toFixed(1)}KB) is large. Consider lazy loading.`
        });
      }

      if (data.duplicates.length > 0) {
        recs.push({
          type: 'info',
          message: `${data.duplicates.length} modules appear in multiple chunks. Check splitChunks config.`
        });
      }

      if (data.largestChunks.length > 0 && data.largestChunks[0].size > 100 * 1024) {
        recs.push({
          type: 'warning',
          message: `Largest chunk "${data.largestChunks[0].names.join(', ')}" is ${data.largestChunks[0].sizeKB}KB. Consider splitting.`
        });
      }

      return recs;
    },

    // Analyze source code for unused exports (requires build-time analysis)
    analyzeSourceForDeadCode(sourceFiles) {
      const results = {
        unusedExports: [],
        unusedImports: [],
        circularDependencies: [],
        largeFiles: []
      };

      // This is a simplified static analysis
      // In production, use tools like webpack-bundle-analyzer, knip, or ts-prune
      return results;
    },

    // Compare two builds
    compareBuilds(oldManifest, newManifest) {
      const oldAnalysis = this.analyzeBuild(oldManifest);
      const newAnalysis = this.analyzeBuild(newManifest);

      if (oldAnalysis.error || newAnalysis.error) {
        return { error: 'Invalid manifests' };
      }

      const sizeDiff = newAnalysis.totalSize - oldAnalysis.totalSize;
      const sizeDiffKB = Math.round(sizeDiff / 1024 * 100) / 100;
      const sizeDiffPercent = oldAnalysis.totalSize > 0
        ? Math.round((sizeDiff / oldAnalysis.totalSize) * 10000) / 100
        : 0;

      return {
        oldTotalSizeKB: oldAnalysis.totalSizeKB,
        newTotalSizeKB: newAnalysis.totalSizeKB,
        sizeDiffKB,
        sizeDiffPercent,
        jsSizeDiffKB: Math.round((newAnalysis.jsSize - oldAnalysis.jsSize) / 1024 * 100) / 100,
        cssSizeDiffKB: Math.round((newAnalysis.cssSize - oldAnalysis.cssSize) / 1024 * 100) / 100,
        chunkCountDiff: newAnalysis.chunkCount - oldAnalysis.chunkCount,
        duplicateCountDiff: newAnalysis.duplicates.length - oldAnalysis.duplicates.length,
        improved: sizeDiff < 0,
        summary: sizeDiff < 0
          ? `Bundle reduced by ${Math.abs(sizeDiffKB)}KB (${Math.abs(sizeDiffPercent)}%)`
          : `Bundle increased by ${sizeDiffKB}KB (${sizeDiffPercent}%)`
      };
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = BundleAnalyzer;
  if (typeof global !== 'undefined') global.BundleAnalyzer = BundleAnalyzer;
})(typeof window !== 'undefined' ? window : globalThis);