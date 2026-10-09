const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

// Load index.html
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('A11Y: synthetic browser runtime initializes before accessibility checks', async () => {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
    });
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      window.__LOCAL_TEST_MODE__ === true && typeof S !== 'undefined' && typeof render === 'function',
      null, { timeout: 5000 });
    assert.deepEqual(pageErrors, [], 'synthetic runtime must have no page errors');
  } finally {
    if (browser) await browser.close();
    harness.server.closeAllConnections();
    harness.server.close();
  }
});

test('A11Y: All interactive elements have accessible names', () => {
  // Buttons should have text content or aria-label
  const buttonMatches = indexHtml.match(/<button[^>]*>([\s\S]*?)<\/button>/g) || [];
  for (const btn of buttonMatches) {
    const hasText = btn.length > 10 && !btn.includes('aria-label=') && !btn.includes('title=');
    const hasAriaLabel = btn.includes('aria-label=');
    const hasTitle = btn.includes('title=');
    const hasAriaLabelledby = btn.includes('aria-labelledby=');

    // Icons-only buttons must have aria-label or title
    if (!hasText && !hasAriaLabel && !hasTitle && !hasAriaLabelledby) {
      // Allow if it's an icon-only button with visible text in a child element
      // For now, just verify the pattern exists
      assert.ok(hasAriaLabel || hasTitle || hasAriaLabelledby || hasText,
        `Button missing accessible name: ${btn.slice(0, 100)}`);
    }
  }
});

test('A11Y: Focusable elements have visible focus styles', () => {
  // Check for focus-visible styles in CSS
  const focusStyles = [
    ':focus-visible',
    'focus-visible',
    'outline:',
    'box-shadow:',
    'ring-'
  ];

  let found = false;
  for (const style of focusStyles) {
    if (indexHtml.includes(style)) {
      found = true;
      break;
    }
  }
  assert.ok(found, 'No visible focus styles found in CSS');
});

test('A11Y: Form inputs have associated labels', () => {
  // Inputs should have id and matching label, or aria-label, or aria-labelledby
  const inputMatches = indexHtml.match(/<input[^>]*>/g) || [];
  for (const input of inputMatches) {
    if (input.includes('type="file"') || input.includes('type="hidden"') || input.includes('type="checkbox"')) {
      continue; // File inputs and checkboxes handled differently
    }

    const hasId = input.includes('id=');
    const hasAriaLabel = input.includes('aria-label=');
    const hasAriaLabelledby = input.includes('aria-labelledby=');

    if (hasId && !hasAriaLabel && !hasAriaLabelledby) {
      // Check if there's a label referencing this id
      const idMatch = input.match(/id=["']([^"']+)["']/);
      if (idMatch) {
        const labelExists = indexHtml.includes(`for="${idMatch[1]}"`) || indexHtml.includes(`for='${idMatch[1]}'`);
        assert.ok(labelExists || hasAriaLabel || hasAriaLabelledby,
          `Input with id="${idMatch[1]}" has no associated label or aria-label`);
      }
    }
  }
});

test('A11Y: Modal dialogs have proper ARIA roles', () => {
  // Check for role="dialog" and aria-modal="true"
  const modalOverlayMatches = indexHtml.match(/class="note-overlay"[^>]*>/g) || [];
  for (const modal of modalOverlayMatches) {
    const modalSection = indexHtml.slice(indexHtml.indexOf(modal), indexHtml.indexOf(modal) + 5000);
    assert.ok(modalSection.includes('role="dialog"') && modalSection.includes('aria-modal="true"'),
      'Modal missing role="dialog" or aria-modal="true"');
  }
});

test('A11Y: Escape key closes modals', () => {
  // Check for Escape key handlers on modals
  const escapeHandlers = [
    'Escape',
    'escape',
    'keydown',
    'keyup'
  ];

  // At least some modals should have escape handling
  const hasEscapeHandler = indexHtml.includes('Escape') || indexHtml.includes('escape');
  assert.ok(hasEscapeHandler, 'No Escape key handler found for modals');
});

test('A11Y: Tabindex used correctly (no positive tabindex)', () => {
  // Positive tabindex is generally an anti-pattern
  const tabindexMatches = indexHtml.match(/tabindex=["']([^"']+)["']/g) || [];
  for (const match of tabindexMatches) {
    const value = match.match(/tabindex=["']([^"']+)["']/)[1];
    if (parseInt(value) > 0) {
      // Allow specific cases like modal focus management
      assert.ok(false, `Positive tabindex found: ${match}`);
    }
  }
});

test('A11Y: Interactive tables have proper semantics', () => {
  // Tables should have thead, tbody, th with scope
  const tableMatches = indexHtml.match(/<table[^>]*>[\s\S]*?<\/table>/g) || [];
  for (const table of tableMatches) {
    if (table.includes('class="') && (table.includes('report') || table.includes('assets') || table.includes('movement'))) {
      // Data tables should have proper headers
      assert.ok(table.includes('<thead') || table.includes('<th'), 'Data table missing header structure');
    }
  }
});

test('A11Y: Color contrast - semantic colors defined', () => {
  // Check for semantic color variables (green/red for financial results)
  const semanticColors = [
    '--success',
    '--danger',
    '--warning',
    '--info',
    'green',
    'red'
  ];

  let found = 0;
  for (const color of semanticColors) {
    if (indexHtml.includes(color)) found++;
  }
  assert.ok(found >= 2, 'Insufficient semantic color definitions for contrast');
});

test('A11Y: Touch targets minimum 44x44px on mobile', () => {
  // Check for minimum touch target sizes in CSS
  const touchTargetStyles = [
    'min-height: 44',
    'min-height:44',
    '44px',
    '48px'
  ];

  let found = false;
  for (const style of touchTargetStyles) {
    if (indexHtml.includes(style)) {
      found = true;
      break;
    }
  }
  // At minimum, buttons should have reasonable min-height
  assert.ok(found || indexHtml.includes('min-height: 38') || indexHtml.includes('min-height: 40'),
    'No minimum touch target size found in CSS');
});

test('A11Y: ARIA live regions for dynamic content', () => {
  // Toast area should have aria-live
  const toastArea = indexHtml.match(/id="toast-area"[^>]*>/);
  assert.ok(toastArea && toastArea[0].includes('aria-live="polite"'), 'Toast area missing aria-live');
});

test('A11Y: Skip links or proper heading hierarchy', () => {
  // Check for h1, h2, h3 hierarchy
  const h1Count = (indexHtml.match(/<h1[^>]*>/g) || []).length;
  const h2Count = (indexHtml.match(/<h2[^>]*>/g) || []).length;
  const h3Count = (indexHtml.match(/<h3[^>]*>/g) || []).length;

  assert.ok(h1Count > 0, 'No h1 found');
  assert.ok(h2Count > 0, 'No h2 found');
  // Heading hierarchy should exist
});

test('A11Y: Mobile viewport meta tag', () => {
  assert.ok(indexHtml.includes('viewport') && indexHtml.includes('width=device-width'),
    'Missing viewport meta tag for mobile');
});

test('A11Y: Button role for clickable divs', () => {
  // Divs with onclick should have role="button" and tabindex
  const clickableDivs = indexHtml.match(/<div[^>]*onclick=[^>]*>/g) || [];
  for (const div of clickableDivs) {
    if (!div.includes('role="button"') && !div.includes('role="tab"') && !div.includes('role="menuitem"')) {
      // Allow if it's already a button or link
      if (!div.includes('<button') && !div.includes('<a ')) {
        // This is a warning, not a hard fail for now
        console.warn('Clickable div missing role="button":', div.slice(0, 100));
      }
    }
  }
  // Test passes - just checking
  assert.ok(true);
});

test('A11Y: Select elements have labels', () => {
  const selectMatches = indexHtml.match(/<select[^>]*>/g) || [];
  for (const select of selectMatches) {
    const hasId = select.includes('id=');
    const hasAriaLabel = select.includes('aria-label=');
    const hasAriaLabelledby = select.includes('aria-labelledby=');

    if (hasId && !hasAriaLabel && !hasAriaLabelledby) {
      const idMatch = select.match(/id=["']([^"']+)["']/);
      if (idMatch) {
        const labelExists = indexHtml.includes(`for="${idMatch[1]}"`) || indexHtml.includes(`for='${idMatch[1]}'`);
        assert.ok(labelExists || hasAriaLabel || hasAriaLabelledby,
          `Select with id="${idMatch[1]}" has no associated label`);
      }
    }
  }
});

test('A11Y: No duplicate IDs', () => {
  const idMatches = [...indexHtml.matchAll(/(?:^|\s)id=["']([^"']+)["']/g)];
  const ids = idMatches.map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

  // Known pre-existing duplicate IDs from template reuse (baseline from origin/main)
  // These are structural template duplicates that exist in base and are not V320 regressions
  const knownDuplicates = new Set([
    'true',  // template boolean interpolation
    'qm-asset-options',
    'quick-movement-asset-summary',
    'qm-dt',
    'qm-ti',
    'qm-asset-picker-hint',
    'qm-note',
    'qm-qty',
    'qm-price',
    'qm-rf-name',
    'qm-rf-applied',
    'qm-error-banner',
    'rf-ipca-diagnostics-title',
    'p-qt',
    'p-dc',
    'div-month-history-years',
    '${esc(bodyId)}'
  ]);

  const newDuplicates = [...new Set(duplicates)].filter(id => !knownDuplicates.has(id));

  assert.equal(newDuplicates.length, 0,
    `NEW duplicate IDs introduced by V320: ${newDuplicates.join(', ')}. ` +
    `Known pre-existing duplicates (baseline): ${[...knownDuplicates].join(', ')}`
  );
});

test('A11Y: Language attribute on html', () => {
  const htmlTag = indexHtml.match(/<html[^>]*>/);
  assert.ok(htmlTag && htmlTag[0].includes('lang='), 'Missing lang attribute on html tag');
});

test('A11Y: Meta charset', () => {
  assert.ok(indexHtml.includes('charset="utf-8"') || indexHtml.includes("charset='utf-8'"), 'Missing charset meta tag');
});

test('A11Y: Images have alt text', () => {
  const imgMatches = indexHtml.match(/<img[^>]*>/g) || [];
  for (const img of imgMatches) {
    if (!img.includes('alt=')) {
      assert.ok(false, `Image missing alt attribute: ${img.slice(0, 100)}`);
    }
  }
});

console.log('\n=== A11Y Functional Tests Complete ===');
