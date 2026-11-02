# Design System

## Color Tokens (CSS Custom Properties)

### Dark Theme (Default)
```css
:root {
  --bg: #0b1220;
  --text: #f4f7fb;
  --muted: #9ab4d6;           /* WCAG AA 4.8:1 on --panel */
  --panel: #121d2f;
  --panel-2: #0f1a2c;
  --card: #121d2f;
  --surface: #101a2b;
  --surface-2: #0d1625;
  --border: #2a3a5c;
  --primary: #4f46e5;
  --success: #22c55e;         /* Financial positive */
  --danger: #ef4444;          /* Financial negative */
  --warning: #f59e0b;
  --info: #60a5fa;
  --stale: #fbbf24;
  --manual: #c084fc;
}
```

### Light Theme
```css
html[data-theme="light"] {
  --bg: #e8eff6;
  --text: #111827;
  --muted: #4f6175;
  --panel: #ffffff;
  --panel-2: #f6f9fc;
  --card: #ffffff;
  --surface: #eef3f8;
  --surface-2: #e2eaf3;
  --border: #b8c8d6;
  --primary: #4057d6;
  --success: #137333;
  --danger: #c62828;
  --warning: #8a5a00;
  --info: #2f6fd1;
  --stale: #8a5a00;
  --manual: #6b3fa0;
}
```

### Canonical Visual System (Frozen Baseline)
```css
:root {
  --canon-bg: #06101b;
  --canon-sidebar: #07111d;
  --canon-panel: #0a1522;
  --canon-panel-2: #0c1826;
  --canon-border: #1b2a3a;
  --canon-text: #f4f7fb;
  --canon-muted: #9ab4d6;
  --canon-green: #10d981;
  --canon-blue: #3292ff;
  --canon-red: #ff4d5f;
  --canon-purple: #a855f7;
  --canon-orange: #ff9f0a;
  --canon-cyan: #20cbd5;
  --canon-radius: 12px;
  --canon-tabular: 1;
}
```

### Semantic Hierarchy
```css
:root {
  --semantic-official: #a5b4fc;      /* Certified data */
  --semantic-partial: #f59e0b;       /* Partial coverage */
  --semantic-operational: #93c5fd;   /* Operational/derived */
  --semantic-official-bg: rgba(165,180,252,.12);
  --semantic-partial-bg: rgba(245,158,11,.12);
  --semantic-operational-bg: rgba(147,197,253,.12);
}
```

---

## Typography

```css
:root {
  --fs-body: 14px;
  --fs-label: 12px;
  --fs-caption: 11px;
  --fs-heading-sm: 16px;
  --fs-heading-md: 20px;
  --fs-heading-lg: 24px;
  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;
}
```

**Rules:**
- Minimum reading size: 12px (--fs-label)
- Maximum weight: 700 (--fw-bold)
- Line height: 1.5 for body, 1.2 for headings

---

## Spacing

```css
:root {
  --sp-1: 4px;
  --sp-2: 6px;
  --sp-3: 8px;
  --sp-4: 10px;
  --sp-5: 12px;
  --sp-6: 16px;
}
```

---

## Border Radius

```css
:root {
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-pill: 999px;
  --ds-radius-card: var(--radius-lg);
  --ds-radius-control: var(--radius-md);
}
```

---

## Shadows

```css
:root {
  --shadow-sm: 0 2px 12px rgba(0,0,0,.12);
  --shadow-md: 0 10px 24px rgba(2,6,23,.08);
  --shadow: 0 18px 50px rgba(0,0,0,.28);
}
```

---

## Components

### Control (Buttons, Inputs, Selects)
```css
.ds-control {
  min-height: var(--control-min-h);    /* 44px - touch target */
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--ds-radius-control);
  font-size: var(--fs-body);
  font-weight: var(--fw-medium);
  transition: background 0.15s, border 0.15s;
}
```

### Card
```css
.ds-card {
  background: var(--ds-surface-elevated);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-card);
  box-shadow: var(--shadow-sm);
  padding: var(--sp-4);
}
```

### Table
```css
.ds-table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.ds-table th,
.ds-table td {
  padding: var(--sp-2) var(--sp-3);
  text-align: left;
  border-bottom: 1px solid var(--ds-border);
}
```

### Financial Number
```css
.fin-positive { color: var(--success); }
.fin-negative { color: var(--danger); }
.fin-neutral  { color: var(--text); }
.fin-stale    { color: var(--stale); }
.fin-manual   { color: var(--manual); }
```

---

## Responsive Breakpoints

```css
/* Mobile first */
@media (max-width: 360px) { /* Galaxy S25 small */ }
@media (max-width: 390px) { /* Galaxy S25 */ }
@media (max-width: 430px) { /* iPhone 14 Pro */ }
@media (max-width: 768px) { /* Tablet portrait */ }
@media (min-width: 769px) and (max-width: 1366px) { /* Desktop small */ }
@media (min-width: 1367px) { /* Desktop large */ }
```

---

## Accessibility

- **Contrast:** All text meets WCAG AA (4.5:1 normal, 3:1 large)
- **Focus:** Visible outline on all interactive elements
- **Touch targets:** Minimum 44×44px (--control-min-h)
- **Semantic HTML:** `<button>`, `<nav>`, `<main>`, `<section>`, `<article>`
- **ARIA:** Labels on icon-only buttons, live regions for async updates

---

## Icon System
- **Library:** Material Symbols Outlined (Google Fonts)
- **SRI:** sha384-mU3FzJNJ/BZ17S5514rJB3bxwX2qryHVXXuRmnJh6/eBWwz7tz4mjDWcp1yhYIix
- **Size:** 22px (--ds-icon-size)
- **Usage:** `<span class="material-symbols-outlined">icon_name</span>`

---

## Motion

```css
:root {
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}
```

**Reduced motion:** Respect `prefers-reduced-motion: reduce`

---

## Usage in Code

```javascript
// Apply theme
document.documentElement.dataset.theme = 'dark'; // or 'light'

// Use tokens
element.style.color = 'var(--success)';
element.style.background = 'var(--ds-surface-elevated)';

// Financial number
function formatFinancial(value, isPositive, isStale) {
  const cls = isStale ? 'fin-stale' : (isPositive ? 'fin-positive' : 'fin-negative');
  return `<span class="${cls}">${formatCurrency(value)}</span>`;
}
```