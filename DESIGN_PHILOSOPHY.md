# Design Philosophy: AIFlow (Dark Mode Only)

## 1. Foundations

### 1.1 Brand Essence

*   **Name:** AIFlow
*   **Tone:** Modern, professional, data-driven, yet warm and approachable
*   **Personality:** Confident (solid blocks, bold headings), energetic (bright accents), user-centric (clear hierarchy, generous spacing)

### 1.2 Typography

*   **Primary Font:** Inter (or system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial)
*   **Weights & Hierarchy:**
    *   **H1 (Page Titles):** 4rem (`text-6xl`), `font-bold`, `leading-tight`
    *   **H2 (Section Titles):** 3rem (`text-5xl`), `font-semibold`, `leading-snug`
    *   **H3 (Subtitles):** 2rem (`text-3xl`), `font-semibold`
    *   **Body:** 1rem (`text-base`), `font-normal`, `leading-relaxed`
    *   **Small/Caption:** 0.875rem (`text-sm`), `font-light`, `leading-normal`
*   **Line-height & Letter-spacing:** Generous line-height (~1.5) and slight letter-tightening on headings for crispness.

## 2. Color Palette (Dark Mode Standard)

| Role              | Color Value                              | Variable Name        |
| :---------------- | :--------------------------------------- | :------------------- |
| **Background**    | `#111827` → `#0F172A` (gradient)          | `--bg-gradient`      |
| **Surface/Cards** | `#1F2937` (gray-800) or `#111827` (gray-900) | `--surface-primary`, `--surface-secondary` |
| **Text Primary**  | `#F9FAFB` (white)                         | `--text-primary`     |
| **Text Secondary**| `#9CA3AF` (gray-400)                      | `--text-secondary`   |
| **Primary Accent**| `#FF4500` (custom orange-600)            | `--accent-primary`   |
| **Accent Hover**  | `#E63E00` (darker orange-700)           | `--accent-primary-hover` |
| **Accent Focus**  | `#FFA500` (lighter orange-500)          | `--accent-primary-focus` |
| **Secondary Accent (Blue)** | `#3B82F6` (blue-500)                  | `--accent-secondary-blue` |
| **Secondary Accent (Purple)**| `#8B5CF6` (purple-500)              | `--accent-secondary-purple` |
| **Status Success**| `#10B981` (green-500)                     | `--status-success`   |
| **Status Warning**| `#F59E0B` (amber-500)                     | `--status-warning`   |
| **Status Error**  | `#EF4444` (red-500)                       | `--status-error`     |
| **Borders/Dividers** | `#374151` (gray-700)                   | `--border-color`     |
| **Input Background**| `#374151` (gray-700)                   | `--input-bg`         |
| **Input Border**  | `#4B5563` (gray-600)                   | `--input-border`     |

**Usage Note:** Reserve `--accent-primary` (`orange-600`) for main actions. Use `--accent-secondary-*` sparingly. All components use these dark mode colors by default.

## 3. Layout & Spacing

*   **Grid:** 12-column, with 24px gutters
*   **Max-width containers:** `max-w-7xl` (≈ 80rem) centered
*   **Section padding:** `py-20` (5rem) top/bottom on large sections; `py-12` (3rem) on smaller ones
*   **Card gutters:** `gap-6` (1.5rem) between cards in grids
*   **Edge padding:** `px-6` (1.5rem) mobile, `px-8` (2rem) desktop

## 4. Backgrounds & Overlays

### 4.1 Page Background

*   **Default:** Full-page gradient (Dark Mode Standard).
    `background: linear-gradient(to bottom right, #111827, #0F172A);`
*   **High-Contrast Variant (hero):** Solid background.
    `background: #111827;`

### 4.2 Section Overlays (Optional)

*   **Vertical gradient overlay:**
    `background: linear-gradient(to bottom, rgba(17, 24, 39, 0.15), transparent 60%);`
*   **Radial vignette:**
    `background: radial-gradient(circle at top, rgba(149, 157, 165, 0.15), transparent 50%);` (Note: Uses lighter base for subtlety, adjust if needed)

## 5. Components

### 5.1 Navbar (Example)

*   **Height:** `h-16` (4rem)
*   **Background:** Transparent over hero, then solid `var(--surface-secondary)` (`gray-900`) on scroll.
*   **Links:** `inline-block px-4 py-2`, `text-base font-medium`, `color: var(--text-secondary)` (`gray-200`), `hover:underline`.

### 5.2 Buttons

| Type          | Base Classes                                                                                          |
| :------------ | :---------------------------------------------------------------------------------------------------- |
| **Primary**   | `bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-[--text-primary] px-6 py-3 rounded-lg shadow-sm hover:shadow-md` |
| **Secondary** | `bg-[--surface-primary] hover:bg-[--surface-secondary] text-[--accent-primary] border border-[--accent-primary] px-6 py-3 rounded-lg` |
| **Ghost**     | `bg-transparent hover:bg-[--surface-secondary] text-[--accent-primary] px-4 py-2 rounded-md`        |
| **Disabled**  | `bg-gray-600 text-gray-400 cursor-not-allowed`                                                        |
| **Icon**      | Square `p-2`, `rounded-full`, use `shadow-sm`                                                        |

### 5.3 Cards & Panels

*   **Background:** `var(--surface-primary)` (`gray-800`)
*   **Border radius:** `rounded-2xl`
*   **Padding:** `p-6` (1.5rem)
*   **Shadow:** `shadow-lg`
*   **Hover Shadow:** Increased `shadow-xl`
*   **Overflow:** `hidden`

### 5.4 Forms & Inputs

```css
.input {
  background: var(--input-bg);      /* gray-700 */
  border: 1px solid var(--input-border); /* gray-600 */
  color: var(--text-primary);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 1rem;
}
.input:focus {
  border-color: var(--accent-primary-focus); /* orange-500 */
  box-shadow: 0 0 0 3px rgba(255, 110, 20, 0.4); /* orange-500 alpha */
  outline: none;
}
```

## 6. Data Visualization

*   **Chart Containers:** `bg-[--surface-secondary]/50` (`gray-900/50`), `rounded-xl`, `p-4`
*   **Axes & Grids:** Subtle stroke `var(--border-color)` (`gray-700`)
*   **Data Series Colors:**
    *   Series A (Primary/Selected): `var(--accent-primary)` (`orange-600`)
    *   Series B (Default/Unselected): `var(--input-border)` (`gray-600`)
    *   Series C (Secondary Blue): `var(--accent-secondary-blue)` (`blue-500`)
    *   Series D (Secondary Purple): `var(--accent-secondary-purple)` (`purple-500`)
*   **Highlights:** Hover tooltips use `bg-[--text-primary] text-[--surface-secondary]` (`white` bg, `gray-900` text)

## 7. Icons & Imagery

*   **Icon Style:** Flat, two-tone (white/orange or orange/gray), line-weight 2px, 24×24px or 32×32px
*   **Illustrations:** Minimal line-work with spot fills in primary accent
*   **Photography:** Use dark-toned, high-contrast images with subtle orange overlay tint

## 8. Interactions & Motion

*   **Transitions:** `transition-all duration-200 ease-out` on hover and focus
*   **Hover States:**
    *   **Buttons:** Darker background (`--accent-primary-hover`) + stronger shadow
    *   **Cards:** `transform: translateY(-2px)` + `shadow-xl`
*   **Loading Spinners:** Circular border with one segment in `var(--accent-primary)`, rest in `var(--border-color)`

## 9. Accessibility

*   **Contrast:** Ensure text meets WCAG AA (4.5:1) using the defined dark mode palette.
*   **Focus States:** Use `outline-none ring-2 ring-[--accent-primary-focus] ring-offset-2 ring-offset-[--surface-primary]` on focusable elements.
*   **Dark Mode:** The application defaults to and remains in dark mode. No toggle is provided.

## Color Palette for Charts and Graphs

All charts and graphs in the dashboard must use the following official color palette:

- **Coquelicot**: `#FF4509`
- **Gold**: `#FFD600`
- **Electric Purple**: `#B200FF`
- **Chartreuse**: `#7FFF00`
- **White**: `#FFFFFF`

These colors should be used consistently for all chart and gauge elements to ensure a cohesive and accessible visual identity across the dashboard.

## Summary

This document defines the AIFlow design system, a clean, **dark-mode-only** SaaS aesthetic anchored by a soft dark gradient background, bold orange accents, and spacious, rounded surfaces. Typography is modern and legible, while interactions are subtle but energetic. All components consistently use the defined dark palette. Following these guidelines ensures a cohesive brand experience across AIFlow. 