---
name: Vibrant Community Connect
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3c494a'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6c7a7a'
  outline-variant: '#bbc9ca'
  surface-tint: '#00696e'
  primary: '#00696e'
  on-primary: '#ffffff'
  primary-container: '#00c2cb'
  on-primary-container: '#004a4e'
  inverse-primary: '#3edae3'
  secondary: '#586062'
  on-secondary: '#ffffff'
  secondary-container: '#dae1e3'
  on-secondary-container: '#5d6466'
  tertiary: '#974803'
  on-tertiary: '#ffffff'
  tertiary-container: '#fb9651'
  on-tertiary-container: '#6d3200'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6bf6ff'
  primary-fixed-dim: '#3edae3'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f53'
  secondary-fixed: '#dde4e6'
  secondary-fixed-dim: '#c1c8ca'
  on-secondary-fixed: '#161d1f'
  on-secondary-fixed-variant: '#41484a'
  tertiary-fixed: '#ffdbc8'
  tertiary-fixed-dim: '#ffb689'
  on-tertiary-fixed: '#311300'
  on-tertiary-fixed-variant: '#743500'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
  display-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 20px
  gutter: 12px
---

## Brand & Style

The design system is built to facilitate a community-driven marketplace that feels approachable, trustworthy, and effortlessly modern. The target audience values speed, visual clarity, and a sense of belonging within a local or niche economy.

The visual style is **Minimalist with a Human Touch**. It prioritizes generous whitespace to let product imagery lead, while using soft geometry to create a friendly atmosphere. Every interaction is designed to feel light and frictionless, emphasizing ease of use in a mobile-first, RTL (Hebrew) environment. The aesthetic avoids clutter, opting for icon-driven navigation and high-quality "breathability" between elements.

## Colors

The palette is anchored by a vibrant teal primary color, symbolizing energy and clarity. 

- **Primary (#00C2CB):** Used for key actions, active states, and brand highlights.
- **Backgrounds:** Pure white is used for the main canvas, with an off-white/very light grey surface for grouping secondary content or listing backgrounds.
- **Neutrals:** Low-contrast greys are reserved for borders and secondary metadata to ensure the interface feels "airy."
- **Accent:** A soft coral is used sparingly for notifications or "saved" states to provide a warm contrast to the teal.

## Typography

The design system utilizes **Plus Jakarta Sans** for its exceptional readability in both Latin and Hebrew scripts. The font's open apertures and modern curves reinforce the friendly marketplace persona.

- **RTL Optimization:** All type scales are adjusted for Hebrew text-rendering, ensuring line-heights provide enough vertical breathing room for diacritics and character heights.
- **Hierarchy:** Bold weights are reserved for product titles and prices. Body text remains light and clean to maintain the minimal aesthetic.
- **Alignment:** All text is right-aligned by default to support the Hebrew language flow.

## Layout & Spacing

This design system employs a **mobile-first, fluid grid** model. The layout relies on a 4px baseline shift to ensure all elements align harmoniously.

- **Margins:** A standard 20px side margin (safe area) is applied to all screens to prevent content from touching the edges of mobile devices.
- **Grid:** A 2-column layout is preferred for product feeds on mobile to maximize visual impact while maintaining scannability.
- **RTL Flow:** The layout mirrors horizontally; the primary "forward" action moves from right-to-left.

## Elevation & Depth

The design system uses **Tonal Layers** and **Ambient Shadows** rather than heavy borders to define depth.

- **Surface Levels:** The base layer is white (#FFFFFF). Cards and interactive containers sit on a slightly elevated "Level 1" which uses a very soft, diffused shadow (0px 4px 20px, 4% opacity) to create a subtle lift.
- **Depth Cues:** High-elevation elements, such as the fixed Bottom Navigation Bar or floating action buttons, use a more pronounced but still natural shadow to indicate they sit above the scrollable content.
- **Interaction:** Upon press, elements may slightly "sink" (shadow reduction) or scale down (0.98x) to provide tactile feedback without visual clutter.

## Shapes

The shape language is defined by **Rounded** geometry to evoke a sense of safety and friendliness.

- **Cards & Containers:** Use a 16px (1rem) corner radius to soften the appearance of the marketplace listings.
- **Buttons:** Primary buttons use a fully rounded "pill" shape (24px+) to make them appear clickable and prominent.
- **Inputs:** Form fields use a 12px radius to balance between the softness of buttons and the structure of cards.
- **Iconography:** Icons should feature rounded caps and corners, avoiding sharp 90-degree angles.

## Components

### Bottom Navigation Bar
A fixed element at the bottom of the viewport. It uses clear, stroke-based icons that switch to solid fills in the primary Teal color when active. Labels are minimal and placed directly below the icon.

### Listing Cards
The centerpiece of the marketplace. Features a large image container with a 16px radius, a small floating "heart" icon in the top-left (RTL) for favorites, and the price in bold Jakarta Sans at the bottom-right of the card info area.

### Action Buttons
- **Primary:** Pill-shaped, teal background, white text. Large enough for easy thumb-tapping (min-height 48px).
- **Secondary:** Transparent background with a subtle light-grey border (#E9ECEF) and teal text.

### Chips & Filters
Used for categories. They feature a light grey background (#F2F4F5) that changes to the primary teal with white text when selected. Corners are fully rounded (pill-style).

### Input Fields
Clean, border-only fields. When focused, the border transitions from light grey to the primary teal. In an RTL context, the placeholder text and icons are right-aligned.

### Action Icons
Circular background containers for secondary actions like "Message Seller" or "Share." These should be icon-only to reduce text-density, using intuitive universal symbols.