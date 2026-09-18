# Swarajya Food Pass Admin — Complete Styling, Coloring & CSS Specification

This document provides a comprehensive guide to all styling tokens, color schemes, typography, layout architecture, animations, and CSS functionalities used in the **Swarajya Food Pass Admin** dashboard application.

---

## Table of Contents
1. [Design Philosophy & Theme Overview](#1-design-philosophy--theme-overview)
2. [Design Tokens & CSS Variables](#2-design-tokens--css-variables)
3. [Typography & Google Fonts](#3-typography--google-fonts)
4. [Color System & Semantic Roles](#4-color-system--semantic-roles)
5. [Visual Effects & Glassmorphism](#5-visual-effects--glassmorphism)
6. [Keyframe Animations & Micro-Interactions](#6-keyframe-animations--micro-interactions)
7. [Global Styles & Element Resets](#7-global-styles--element-resets)
8. [Component-by-Component CSS Specifications](#8-component-by-component-css-specifications)
   - [8.1 Password Gate Screen](#81-password-gate-screen)
   - [8.2 Fatal / Error Gate Screen](#82-fatal--error-gate-screen)
   - [8.3 Dashboard Header & Live Indicator](#83-dashboard-header--live-indicator)
   - [8.4 Summary Statistics Cards](#84-summary-statistics-cards)
   - [8.5 Search & Filter Bar](#85-search--filter-bar)
   - [8.6 Participant Data Table / Grid](#86-participant-data-table--grid)
   - [8.7 Checkpoint Scan Details Dropdown Popover](#87-checkpoint-scan-details-dropdown-popover)
   - [8.8 Participant Detail Modal / Drawer](#88-participant-detail-modal--drawer)
   - [8.9 Manual Override Audit Logs View](#89-manual-override-audit-logs-view)
9. [Interactive State Classes Matrix](#9-interactive-state-classes-matrix)
10. [Responsive Design & Media Queries](#10-responsive-design--media-queries)
11. [Accessibility & Reduced Motion](#11-accessibility--reduced-motion)

---

## 1. Design Philosophy & Theme Overview

The interface marries an **Indian cultural/festive theme ("स्वराज्य" - Swarajya)** with a modern, high-contrast, dark-mode administrative dashboard.

- **Atmosphere**: Deep warm dark obsidian background (`#12100e`) illuminated by warm saffron (`#FF6B35`) and crimson red (`#D62424`) accents.
- **Glassmorphism & Depth**: Translucent surfaces (`rgba(30, 25, 22, 0.85)` / `backdrop-filter: blur(14px)`), ambient colored radial glow lights, and layered drop shadows.
- **Real-Time Visual Feedback**: Pulsing live indicators, flashing row updates on new scans, smooth modal transitions, and distinct status color indicators.

---

## 2. Design Tokens & CSS Variables

All core tokens are declared on `:root` in `src/index.css`:

```css
:root {
  /* Brand Accent Colors */
  --brand-red: #D62424;
  --brand-red-hover: #B01E1E;
  --brand-saffron: #FF6B35;
  --brand-saffron-alt: #ff9933;
  --brand-gradient: linear-gradient(135deg, #FF6B35 0%, #D62424 100%);
  --brand-gradient-hover: linear-gradient(135deg, #D62424 0%, #B01E1E 100%);
  
  /* Background & Surface Colors */
  --bg-dark: #12100e;
  --bg-dark-secondary: #1a1512;
  --card-bg: #1e1916;
  --input-bg: #15110f;
  
  /* Text & Content Colors */
  --text-primary: #f5e6d3;
  --text-secondary: #cbbba8;
  --text-muted: #9a8a78;
  
  /* Status & Operational Colors */
  --confirm: #1fae5f;
  --duplicate: #e2493a;
  --error: #d97706;
  
  /* Typography Tokens */
  --font-title: 'Yatra One', cursive;
  --font-subtitle: 'Kalam', cursive;
  --font-heading: 'Poppins', sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
}
```

---

## 3. Typography & Google Fonts

The application imports five Google Fonts via `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Yatra+One&family=Poppins:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
```

### Font Hierarchy & Roles

| Token | Font Family | Fallback | Weights Used | Role & Typical Elements |
|---|---|---|---|---|
| `--font-title` | `'Yatra One'` | `cursive` | `400` | Main Devanagari branding title (`.brand-title`, `.gate-brand-title`, `.logs-title`) |
| `--font-subtitle` | `'Kalam'` | `cursive` | `700` | Handwritten aesthetic sub-branding (`.brand-subtitle`, `.gate-brand-subtitle`, `.logs-subtitle`) |
| `--font-heading` | `'Poppins'` | `sans-serif` | `600`, `700`, `800` | Section headers, table headers, numbers, buttons, badges, chips, labels |
| `--font-body` | `'Inter'` | `system-ui, sans-serif` | `400`, `500`, `600` | Body copy, general table cells, input inputs, note descriptions |

---

## 4. Color System & Semantic Roles

### 4.1 Primary & Brand Palette
- **Saffron Primary (`#FF6B35` / `var(--brand-saffron)`)**: Brand identity, active borders, glow highlights, dropdown headings, focus outlines.
- **Crimson Red (`#D62424` / `var(--brand-red)`)**: Primary button gradient stop, top decorative bar stop, total participant card accent.
- **Brand Linear Gradient (`linear-gradient(135deg, #FF6B35 0%, #D62424 100%)`)**: Primary CTAs, active filter chips, top decorative border, modal accent bars.

### 4.2 Surfaces & Backgrounds
- **Deep Obsidian Base (`#12100e` / `var(--bg-dark)`)**: Root body background.
- **Ambient Radial Gradient**: `radial-gradient(circle at top right, #1f1b18 0%, var(--bg-dark) 100%)`.
- **Card Surface (`#1e1916` / `var(--card-bg)`)**: Cards, table container, modal background, toolbars.
- **Input Sunken Surface (`#15110f` / `var(--input-bg)`)**: Text inputs, search bars, filter buttons.

### 4.3 Text Palette
- **Text Primary (`#f5e6d3` / `var(--text-primary)`)**: High-contrast warm off-white / light cream for headers, participant names, and values.
- **Text Secondary (`#cbbba8` / `var(--text-secondary)`)**: Medium-contrast sand for subheadings, registration numbers, metadata.
- **Text Muted (`#9a8a78` / `var(--text-muted)`)**: Low-contrast warm gray for counts, empty state hints, timestamps.

### 4.4 Status & Feedback Palette
- **Confirmed / Done (`#1fae5f` / `var(--confirm)`)**:
  - Checkpoint status dot completed state
  - Real-time live pulse dot
  - Fully-done stat card top border and numbers
  - Success feedback text and confirm badges (`rgba(31, 174, 95, 0.12)`)
- **Error / Red Warning (`#ff6b6b`, `#e2493a` / `var(--duplicate)`)**:
  - Undo buttons and undo badges
  - Password gate validation error messages
  - Setup needed fatal screen
- **Amber Warning (`#d97706` / `var(--error)`)**: General error states.

---

## 5. Visual Effects & Glassmorphism

1. **Top Decorative Ribbon**:
   ```css
   body::before {
     content: '';
     position: absolute;
     top: 0; left: 0; right: 0;
     height: 6px;
     background: var(--brand-gradient);
     z-index: 100;
   }
   ```
2. **Frosted Glass Cards (Backdrop Blur)**:
   - `background: rgba(30, 25, 22, 0.85);`
   - `backdrop-filter: blur(14px);`
   - `border: 1px solid rgba(255, 107, 53, 0.15);`
3. **Ambient Light Glows**:
   - Gate screen utilizes `::before` (crimson radial glow, top-left) and `::after` (saffron radial glow, bottom-right).
4. **Focus Rings**:
   - `outline: 3px solid var(--brand-saffron); outline-offset: 2px;`

---

## 6. Keyframe Animations & Micro-Interactions

| Animation Name | Duration / Timing | Description |
|---|---|---|
| `pulse-live` | `1.8s infinite` | Expanding ripple glow on the emerald live status indicator |
| `row-flash` | `1200ms cubic-bezier(0.16, 1, 0.3, 1)` | Highlights updated participant rows with a warm saffron flash upon receiving a real-time scan |
| `fade-in` | `0.2s ease-out` | Smooth opacity transition for modal backdrops |
| `slide-up` | `0.3s cubic-bezier(0.16, 1, 0.3, 1)` | Mobile drawer / modal sliding into view from bottom |
| `dropdown-fade-in` | `0.25s cubic-bezier(0.16, 1, 0.3, 1)` | Popover scale & fade downward into place |
| `logs-spin` | `1s linear infinite` | 360-degree rotation for async loading spinners |

---

## 7. Global Styles & Element Resets

```css
* {
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  margin: 0;
}

button {
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

input {
  font-family: inherit;
  transition: all 0.2s ease;
}
```

---

## 8. Component-by-Component CSS Specifications

### 8.1 Password Gate Screen
- **Class**: `.gate-screen`, `.gate-card`, `.gate-brand-container`, `.gate-logo`, `.gate-brand-title`, `.gate-brand-subtitle`, `.gate-error`, `.gate-note`, `.primary-button`
- **Functionality**:
  - Full-screen centered login container (`min-height: 100vh`) with dual radial ambient glows.
  - Logo with warm drop shadow (`filter: drop-shadow(0 4px 15px rgba(255, 107, 53, 0.3))`).
  - Frosted glass form card with 4px top brand gradient border.
  - Fully rounded pill inputs (`border-radius: 50px`) with saffron focus rings.
  - Primary button with gradient fill and hover lift (`transform: translateY(-2px)`).

### 8.2 Fatal / Error Gate Screen
- **Class**: `.fatal-screen`, `.fatal-headline`, `.eyebrow`
- **Functionality**:
  - Full-screen centered setup error banner.
  - Uppercase tracked eyebrow text (`color: var(--brand-saffron); letter-spacing: 0.14em`).
  - Error card with 4px red accent top border.

### 8.3 Dashboard Header & Live Indicator
- **Class**: `.dash-header`, `.dash-header-top`, `.dash-brand-container`, `.dash-logo`, `.brand-title`, `.brand-subtitle`, `.dash-actions`, `.live-indicator-container`, `.live-dot`, `.live-text`, `.refresh-button`
- **Functionality**:
  - Responsive flex header with wrap behavior.
  - Live status pill badge with pulsing green animated dot.
  - Pill action buttons (Refresh & Override Logs) with subtle saffron borders and hover feedback.

### 8.4 Summary Statistics Cards
- **Class**: `.stat-strip`, `.stat-card`, `.stat-card-total`, `.stat-card-done`, `.stat-number`, `.stat-label`
- **Functionality**:
  - CSS Grid with `repeat(auto-fit, minmax(180px, 1fr))` auto-responsive sizing.
  - Top colored accent indicator:
    - Default checkpoint card: Saffron (`var(--brand-saffron)`)
    - Total registered card: Red (`var(--brand-red)`)
    - Fully done card: Emerald (`var(--confirm)`)
  - Subtle top-to-bottom white shine overlay (`::after`).
  - Hover animation: `transform: translateY(-4px)` with enhanced shadow.

### 8.5 Search & Filter Bar
- **Class**: `.search-filter-bar`, `.search-input`, `.filter-chips`, `.filter-chip`, `.result-count`
- **Functionality**:
  - Flex container hosting instant search input and quick-filter chips.
  - Pill search box with smooth border/shadow transition on focus.
  - Filter chips:
    - Inactive: dark background with muted text.
    - Active (`.is-active`): Gradient background with crimson glow shadow.
  - Result count indicator right-aligned.

### 8.6 Participant Data Table / Grid
- **Class**: `.grid-scroll`, `.participant-table`, `thead th`, `tbody tr`, `.col-name`, `.col-reg`, `.col-checkpoint`, `.status-dot`, `.status-dot.is-done`
- **Functionality**:
  - Responsive horizontal scrolling wrapper with rounded corners.
  - Sticky table headers (`position: sticky; top: 0; background: #2a201a`) with bottom saffron border.
  - Hoverable rows with pointer cursor to open participant detail view.
  - Real-time row flash animation (`.is-flashing`) on live WebSocket/Supabase scan events.
  - Status dots:
    - Unscanned: Hollow ring with subtle dark border (`border: 2px solid #4a3e35`).
    - Scanned (`.is-done`): Solid green fill with emerald glow and centered checkmark icon (`✓`).

### 8.7 Checkpoint Scan Details Dropdown Popover
- **Class**: `.checkpoint-cell`, `.checkpoint-dropdown-btn`, `.checkpoint-dropdown-menu`, `.dropdown-header`, `.dropdown-divider`, `.dropdown-body`, `.dropdown-info-item`, `.info-label`, `.info-value`, `.info-value.highlight`, `.info-value.is-pending`
- **Functionality**:
  - Small circular trigger button next to status dots with rotate chevron animation (`transform: rotate(180deg)`).
  - Absolute positioned popover speech bubble with decorative arrow pointer (`::before` rotated 45 degrees).
  - Glassmorphic surface with blur and saffron border.
  - Displays device metadata (`Scanned By`, `Time`, or pending status badge).

### 8.8 Participant Detail Modal / Drawer
- **Class**: `.detail-overlay`, `.detail-panel`, `.detail-header`, `.detail-reg`, `.link-button`, `.detail-checkpoint-list`, `.detail-checkpoint-row`, `.detail-checkpoint-top`, `.detail-checkpoint-label`, `.detail-checkpoint-meta`, `.detail-action-button`, `.is-undo`, `.detail-undo-row`, `.detail-feedback`
- **Functionality**:
  - Modal overlay with frosted background (`backdrop-filter: blur(8px)`).
  - Bottom sheet on mobile (`align-items: flex-end`) transitioning to centered modal on desktop (`min-width: 640px`).
  - Action button ("Mark as done"): Gradient fill CTA.
  - Undo row: Reason input field and red hollow button for reversing scans.
  - Real-time inline feedback messages for success or duplicate actions.

### 8.9 Manual Override Audit Logs View
- **Class**: `.logs-view-container`, `.logs-header`, `.logs-title`, `.logs-subtitle`, `.logs-action-btn`, `.logs-toolbar`, `.logs-search-wrapper`, `.logs-search-input`, `.logs-clear-search-btn`, `.logs-filter-wrapper`, `.logs-select-filter`, `.logs-table-card`, `.logs-table`, `.logs-badge`, `.badge-confirm`, `.badge-undo`, `.logs-note-bubble`, `.logs-empty-state`, `.logs-loading-state`, `.logs-spinner`, `.logs-footer`
- **Functionality**:
  - Dedicated audit trail page opened via `?page=logs`.
  - Search bar with clear button (`×`) and action dropdown filter (`All`, `Manual Confirmations`, `Manual Undos`).
  - Status badges: Green pill for confirmations, Red pill for undos.
  - Note bubble with left accent line for admin justification messages.
  - Circular animated loading spinner.

---

## 9. Interactive State Classes Matrix

| State Class | Applicable Selectors | Visual Representation |
|---|---|---|
| `.is-active` | `.filter-chip`, `.checkpoint-dropdown-btn` | Gradient active fill or rotated 180° saffron button |
| `.is-done` | `.status-dot` | Green background, glowing emerald shadow, checkmark |
| `.is-flashing` | `tbody tr` | 1.2s saffron background fade animation |
| `.is-undo` | `.detail-action-button`, `.logs-note-bubble` | Red outline button or saffron-accented quote bubble |
| `.is-error` | `.dashboard-status`, `.detail-feedback`, `.logs-error-message` | Red text or red tinted alert banner |
| `.is-pending` | `.info-value` | Muted italic text |
| `:disabled` | `button` | 50% opacity, `cursor: not-allowed` |
| `:hover` | `.primary-button`, `.stat-card`, `.refresh-button` | Lift `translateY(-2px / -4px)`, glow elevation |

---

## 10. Responsive Design & Media Queries

- **Fluid Grid Layouts**:
  - Summary stats grid automatically reflows with `minmax(180px, 1fr)`.
  - Participant table wrapped in `.grid-scroll` with horizontal scrolling on smaller viewports.
- **Desktop Modal Breakpoint (`@media (min-width: 640px)`)**:
  - `.detail-overlay` aligns centered (`align-items: center`).
  - `.detail-panel` switches from bottom sheet to rounded floating modal dialog (`border-radius: 24px`).
- **Flexible Toolbars & Headers**:
  - Headers and search bars use `flex-wrap: wrap` with `gap` spacing to gracefully break across mobile and tablet screens.

---

## 11. Accessibility & Reduced Motion

- **Motion Sensitivity Support**:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .participant-table tbody tr.is-flashing {
      animation: none;
      background: rgba(255, 107, 53, 0.25);
    }
  }
  ```
- **Keyboard Navigation & Focus**:
  - Visible focus outlines (`:focus-visible`) on all interactive inputs and buttons.
- **ARIA & Role Compliance**:
  - Semantic HTML (`<header>`, `<main>`, `<table>`, `<thead>`, `<tbody>`, `<button>`).
  - Status dot labels configured with `role="img"` and `aria-label`.
  - Dropdown buttons include `aria-expanded` and `title` attributes.
