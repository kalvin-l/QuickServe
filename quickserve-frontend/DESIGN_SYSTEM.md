# QuickServe Design System

> A warm, human-centered design system for café/restaurant ordering experiences.

---

## Philosophy

- **Warm & Human**: Uses warm earth tones, soft shadows, and tactile feedback
- **Minimal & Clean**: White space, clear hierarchy, unobtrusive UI
- **Responsive**: Mobile-first, scales elegantly to desktop
- **Accessible**: High contrast text, clear interactive states

---

## Color Palette

### Primary Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-primary` | `#faf9f7` | Page background, warm off-white |
| `--color-text-primary` | `#2d2a26` | Headings, primary text (soft black) |
| `--color-accent` | `#d4a574` | CTA buttons, highlights, caramel/terracotta |
| `--color-accent-hover` | `#c49a6b` | Accent hover state |

### Secondary Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-text-secondary` | `#5c5752` | Body text, secondary content |
| `--color-text-muted` | `#8b8680` | Placeholder text, disabled states, hints |
| `--color-border` | `#e8e4df` | Borders, dividers (with `/60` opacity) |
| `--color-surface` | `#ffffff` | Cards, modals, elevated surfaces |
| `--color-surface-alt` | `#f5f0eb` | Alternate surface, subtle highlights |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#22c55e` | Success states, paid status |
| `--color-success-bg` | `#f0fdf4` | Success backgrounds |
| `--color-error` | `#ef4444` | Error states, delete actions |
| `--color-error-bg` | `#fef2f2` | Error backgrounds |
| `--color-warning` | `#f59e0b` | Warning states |

### Usage Patterns

```css
/* Page Background */
bg-[#faf9f7]

/* Cards */
bg-white border border-[#e8e4df]/60

/* Offset Shadow Card Pattern */
relative bg-white rounded-2xl p-6 border border-[#e8e4df]/60
/* Plus shadow element: */
absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10

/* Primary Button */
bg-[#2d2a26] text-white hover:bg-[#3d3a36]

/* Accent Text */
text-[#d4a574]

/* Secondary Text */
text-[#8b8680]

/* Muted Background */
bg-[#faf9f7]
```

---

## Typography

### Font Stack

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Type Scale

| Level | Size | Weight | Letter-Spacing | Usage |
|-------|------|--------|----------------|-------|
| **Display** | `text-4xl md:text-5xl` | `font-semibold` | `tracking-tight` | Hero headlines |
| **H1** | `text-3xl md:text-4xl` | `font-semibold` | `tracking-tight` | Page titles |
| **H2** | `text-2xl md:text-3xl` | `font-semibold` | `tracking-tight` | Section headers |
| **H3** | `text-xl md:text-2xl` | `font-semibold` | `tracking-tight` | Card titles |
| **H4** | `text-lg` | `font-semibold` | `tracking-tight` | Subsection titles |
| **Body** | `text-sm md:text-base` | `font-normal` | `normal` | Paragraph text |
| **Small** | `text-xs` | `font-normal` | `normal` | Captions, metadata |
| **Label** | `text-[10px] md:text-xs` | `font-bold` | `tracking-[0.15em]` | Uppercase labels |
| **Button** | `text-sm` | `font-semibold` | `normal` | Button text |

### Typography Patterns

```css
/* Section Label */
text-[10px] font-bold tracking-[0.15em] uppercase

/* Card Title */
text-lg font-semibold text-[#2d2a26] tracking-tight

/* Body Text */
text-sm text-[#5c5752] leading-relaxed

/* Price Display */
text-2xl font-bold text-[#d4a574]

/* Metadata/Caption */
text-xs text-[#8b8680]
```

---

## Spacing System

### Base Unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps, icon padding |
| `space-2` | 8px | Small gaps, tight groups |
| `space-3` | 12px | Standard gaps |
| `space-4` | 16px | Section padding |
| `space-5` | 20px | Card padding |
| `space-6` | 24px | Large section padding |
| `space-8` | 32px | Major section breaks |
| `space-10` | 40px | Page-level spacing |

### Layout Spacing

```css
/* Page Container */
px-4 sm:px-6 lg:px-8 py-6 sm:py-8

/* Card Padding */
p-4 sm:p-5 lg:p-6

/* Section Gap */
space-y-4 sm:space-y-6

/* Card Gap */
gap-4 sm:gap-6
```

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 2px | Small elements |
| `rounded-md` | 6px | Tags, small buttons |
| `rounded-lg` | 8px | Input fields, small cards |
| `rounded-xl` | 12px | Cards, buttons |
| `rounded-2xl` | 16px | Large cards, modals |
| `rounded-full` | 9999px | Pills, avatars, badges |

---

## Shadows

### Offset Shadow Pattern (Primary)

```css
/* Container */
relative bg-white rounded-2xl border border-[#e8e4df]/60

/* Shadow Element */
absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10
```

This creates a warm, tactile "pressed paper" effect that feels human and organic.

### Standard Shadows

```css
/* Card Shadow */
shadow-sm

/* Elevated Shadow */
shadow-md

/* Modal Shadow */
shadow-2xl
```

---

## Components

### Buttons

#### Primary Button
```css
bg-[#2d2a26] text-white font-semibold py-3.5 px-6 rounded-xl 
hover:bg-[#3d3a36] active:scale-[0.98] transition-all
```

#### Secondary Button
```css
bg-white text-[#2d2a26] font-semibold py-3.5 px-6 rounded-xl 
border border-[#e8e4df]/60 hover:bg-[#faf9f7] transition-all
```

#### Accent Button
```css
bg-[#d4a574] text-white font-semibold py-3.5 px-6 rounded-xl 
hover:bg-[#c49a6b] transition-all
```

### Cards

#### Standard Card
```css
relative bg-white rounded-2xl p-5 border border-[#e8e4df]/60 shadow-sm
```

#### Card with Offset Shadow
```css
relative bg-white rounded-2xl p-6 border border-[#e8e4df]/60
/* Add shadow element as child */
```

### Inputs

#### Text Input
```css
w-full px-4 py-3 rounded-xl border border-[#e8e4df]/60 bg-[#faf9f7]
text-[#2d2a26] placeholder:text-[#8b8680]/60
focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 outline-none
transition-all
```

### Badges

#### Count Badge
```css
text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center
bg-[#d4a574] text-white
```

#### Status Badge
```css
text-xs font-medium px-2.5 py-1 rounded-full
/* Active: */ bg-green-50 text-green-700
/* Pending: */ bg-[#faf9f7] text-[#8b8680]
```

### Modals

#### Modal Container
```css
relative bg-white rounded-2xl shadow-2xl w-full max-h-[85vh] 
overflow-hidden flex flex-col max-w-md (or lg/xl)
```

---

## Layout Patterns

### Page Structure

```
┌─────────────────────────────┐
│  bg-[#faf9f7]               │
│  ┌─────────────────────┐    │
│  │  Header Card        │    │
│  │  (offset shadow)    │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │  Content Grid       │    │
│  │  (cards)            │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

### Card Grid

```css
/* Mobile: 1 column */
/* Desktop: 2-3 columns */
grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6
```

### Info Grid (3 columns)

```css
grid grid-cols-3 gap-2 sm:gap-3
```

---

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large |

### Mobile-First Patterns

```css
/* Default (mobile) */
text-base px-4

/* sm */
sm:text-lg sm:px-6

/* lg */
lg:text-xl lg:px-8
```

---

## Icons

### Library
- **Lucide React** - Primary icon library
- Replace Font Awesome with Lucide equivalents

### Icon Sizes

| Size | Value | Usage |
|------|-------|-------|
| `xs` | `w-3 h-3` | Inline with text |
| `sm` | `w-4 h-4` | Buttons, small elements |
| `md` | `w-5 h-5` | Standard icons |
| `lg` | `w-6 h-6` | Feature icons |
| `xl` | `w-8 h-8` | Header icons |

### Icon Patterns

```css
/* Button Icon */
w-4 h-4

/* Feature Icon (in circle) */
w-6 h-6 (inside w-12 h-12 container)

/* Standalone Feature */
w-8 h-8
```

---

## Animations

### Transitions

```css
/* Standard */
transition-all duration-200

/* Hover Scale */
hover:scale-105 transition-transform

/* Active Press */
active:scale-[0.98] transition-transform
```

### Loading States

```css
/* Spinner */
animate-spin

/* Pulse (skeleton) */
animate-pulse
```

---

## Common Patterns

### Header Section

```tsx
<div className="relative mx-4 sm:mx-6 lg:mx-8 mb-8">
  <div className="absolute inset-0 bg-[#d4a574]/20 rounded-2xl translate-x-0.5 translate-y-0.5" />
  <div className="relative bg-white rounded-2xl p-6 sm:p-8 border border-[#e8e4df]/60 shadow-sm">
    {/* Content */}
  </div>
</div>
```

### Filter Tabs (Scrollable)

```tsx
<div className="flex items-center gap-1 border-b border-[#e8e4df]/60 
                overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
  {items.map(item => (
    <button key={item} className="shrink-0 whitespace-nowrap px-4 py-3">
      {item}
    </button>
  ))}
</div>
```

### Empty State

```tsx
<div className="text-center py-12">
  <div className="w-16 h-16 rounded-full bg-[#faf9f7] border border-[#e8e4df]/60 
                  mx-auto flex items-center justify-center mb-4">
    <Icon className="w-6 h-6 text-[#8b8680]" />
  </div>
  <h3 className="text-[#2d2a26] font-medium">Title</h3>
  <p className="text-sm text-[#8b8680] mt-1">Description</p>
</div>
```

---

## Do's and Don'ts

### ✅ Do
- Use warm background `#faf9f7` for all pages
- Apply offset shadow to all cards
- Use `tracking-tight` for headings
- Use uppercase tracking for labels
- Maintain consistent spacing (multiples of 4)
- Round corners: `rounded-xl` or `rounded-2xl`

### ❌ Don't
- Use pure black (`#000000`) - use `#2d2a26` instead
- Use pure white backgrounds - use `#faf9f7`
- Use sharp corners - everything should be rounded
- Use cool grays - stick to warm `#e8e4df`, `#8b8680`
- Forget the offset shadow on cards

---

## Quick Reference

```css
/* PAGE */
bg-[#faf9f7]

/* CARD */
relative bg-white rounded-2xl p-6 border border-[#e8e4df]/60
  ↳ shadow: absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10

/* HEADING */
text-2xl font-semibold text-[#2d2a26] tracking-tight

/* LABEL */
text-[10px] font-bold text-[#2d2a26] tracking-[0.15em] uppercase

/* BODY */
text-sm text-[#5c5752]

/* MUTED */
text-xs text-[#8b8680]

/* BUTTON PRIMARY */
bg-[#2d2a26] text-white font-semibold py-3.5 px-6 rounded-xl

/* BUTTON SECONDARY */
bg-white text-[#2d2a26] border border-[#e8e4df]/60 py-3.5 px-6 rounded-xl

/* ACCENT PRICE */
text-2xl font-bold text-[#d4a574]

/* INPUT */
px-4 py-3 rounded-xl border border-[#e8e4df]/60 bg-[#faf9f7]
```

---

## Files to Reference

- `app/page.tsx` - Home page with hero and card examples
- `app/(customer)/menu/page.tsx` - Menu with product cards
- `app/(customer)/orders/page.tsx` - Orders with filter tabs
- `components/customer/product/ProductDetailModal.tsx` - Modal example
- `components/customer/cart/CartModal.tsx` - Cart modal pattern

---

*Last Updated: 2026-02-10*
*Version: 1.0*
