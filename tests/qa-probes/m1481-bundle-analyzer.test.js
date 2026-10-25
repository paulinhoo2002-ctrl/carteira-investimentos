/**
 * M1481 — Bundle Analyzer Tests
 */
const BA = require('../../analytics-bundle-analyzer.js');

console.log('=== M1481 Bundle Analyzer Tests ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) { console.log('✓ PASS:', message); passCount++; }
  else { console.log('✗ FAIL:', message); failCount++; }
}

// Test 1: analyzeBuild with empty manifest
const emptyResult = BA.analyzeBuild({});
assert(emptyResult.error === 'Invalid build manifest', 'Empty manifest returns error');

// Test 2: analyzeBuild with valid manifest
const mockManifest = {
  chunks: [
    {
      id: 0,
      names: ['main.js'],
      size: 250000,
      modules: [
        { id: './src/main.js', size: 50000 },
        { id: './src/utils.js', size: 30000 },
        { id: 'lodash', size: 70000 }
      ],
      rendered: true
    },
    {
      id: 1,
      names: ['vendor.js'],
      size: 180000,
      modules: [
        { id: 'react', size: 80000 },
        { id: 'lodash', size: 70000 },
        { id: 'moment', size: 30000 }
      ],
      rendered: true
    }
  ],
  assets: [
    { name: 'main.js', size: 250000, type: 'js' },
    { name: 'vendor.js', size: 180000, type: 'js' },
    { name: 'styles.css', size: 45000, type: 'css' }
  ]
};

const analysis = BA.analyzeBuild(mockManifest);
assert(!analysis.error, 'Valid manifest analyzed successfully');
assert(analysis.totalSize === 430000, 'Total size = 430000');
assert(analysis.totalSizeKB === 419.92, 'Total size KB = 419.92');
assert(analysis.jsSize === 430000, 'JS size = 430000');
assert(analysis.cssSize === 45000, 'CSS size = 45000');
assert(analysis.chunkCount === 2, 'Chunk count = 2');
assert(analysis.assetCount === 3, 'Asset count = 3');

// Test 3: Largest chunks identified
assert(analysis.largestChunks.length === 2, 'Two largest chunks identified');
assert(analysis.largestChunks[0].size === 250000, 'Largest chunk is main.js (250KB)');
assert(analysis.largestChunks[0].names.includes('main.js'), 'Largest chunk name correct');

// Test 4: Duplicates detected
assert(analysis.duplicates.length === 1, 'One duplicate module (lodash)');
assert(analysis.duplicates[0].module === 'lodash', 'Duplicate is lodash');
assert(analysis.duplicates[0].count === 2, 'Lodash appears in 2 chunks');

// Test 5: Asset breakdown
assert(analysis.assetBreakdown.length === 3, 'Three assets in breakdown');
assert(analysis.assetBreakdown[0].type === 'js', 'First asset is JS');
assert(analysis.assetBreakdown[2].type === 'css', 'Third asset is CSS');

// Test 6: Recommendations generated
assert(Array.isArray(analysis.recommendations), 'Recommendations is array');
assert(analysis.recommendations.length > 0, 'Recommendations generated');

// Test 7: compareBuilds - size reduction
const oldManifest = {
  chunks: [{ id: 0, names: ['main.js'], size: 500000, modules: [], rendered: true }],
  assets: [{ name: 'main.js', size: 500000, type: 'js' }]
};
const newManifest = {
  chunks: [{ id: 0, names: ['main.js'], size: 400000, modules: [], rendered: true }],
  assets: [{ name: 'main.js', size: 400000, type: 'js' }]
};

const comparison = BA.compareBuilds(oldManifest, newManifest);
assert(!comparison.error, 'Comparison successful');
assert(comparison.oldTotalSizeKB === 488.28, 'Old size = 488.28KB');
// 400000 / 1024 = 390.625, rounds to 390.63
assert(comparison.newTotalSizeKB === 390.63, 'New size = 390.63KB');
assert(comparison.sizeDiffKB === -97.66, 'Size diff = -97.66KB');
assert(comparison.sizeDiffPercent === -20, 'Size diff = -20%');
assert(comparison.improved === true, 'Improved = true');
assert(comparison.summary.includes('reduced'), 'Summary mentions reduced');

// Test 8: compareBuilds - size increase
const comparison2 = BA.compareBuilds(newManifest, oldManifest);
assert(comparison2.sizeDiffKB === 97.66, 'Size diff = +97.66KB');
assert(comparison2.sizeDiffPercent === 25, 'Size diff = +25%');
assert(comparison2.improved === false, 'Improved = false');
assert(comparison2.summary.includes('increased'), 'Summary mentions increased');

// Test 8b: Invalid manifests
const invalidComparison = BA.compareBuilds({}, mockManifest);
assert(invalidComparison.error, 'Invalid manifest returns error');

// Test 9: Large chunk warning
const largeManifest = {
  chunks: [{ id: 0, names: ['huge.js'], size: 150000, modules: [], rendered: true }],
  assets: [{ name: 'huge.js', size: 150000, type: 'js' }]
};
const largeAnalysis = BA.analyzeBuild(largeManifest);
const largeRecs = largeAnalysis.recommendations;
assert(largeRecs.some(r => r.message.includes('Largest chunk')), 'Large chunk warning generated');

// Test 10: Duplicate warning
const dupManifest = {
  chunks: [
    { id: 0, names: ['a.js'], size: 100000, modules: ['lodash', 'react'], rendered: true },
    { id: 1, names: ['b.js'], size: 100000, modules: ['lodash', 'vue'], rendered: true }
  ],
  assets: []
};
const dupAnalysis = BA.analyzeBuild(dupManifest);
assert(dupAnalysis.recommendations.some(r => r.message.includes('multiple chunks')), 'Duplicate module warning generated');

// Test 11: analyzeSourceForDeadCode (placeholder)
const deadCode = BA.analyzeSourceForDeadCode([]);
assert(deadCode.unusedExports.length === 0, 'Dead code analysis returns empty arrays');

// Test 12: Error handling
const errorResult = BA.analyzeBuild(null);
assert(errorResult.error, 'Null manifest returns error');

const errorResult2 = BA.analyzeBuild('not an object');
assert(errorResult2.error, 'String manifest returns error');

const errorResult3 = BA.analyzeBuild({ chunks: null });
// null chunks is handled gracefully (treated as empty array)
assert(!errorResult3.error, 'Null chunks handled gracefully (treated as empty)');
assert(errorResult3.chunkCount === 0, 'Null chunks results in chunkCount = 0');

// Summary
console.log('\n=== SUMMARY ===');
console.log('Passed:', passCount);
console.log('Failed:', failCount);
console.log('Total:', passCount + failCount);

if (failCount > 0) process.exit(1);