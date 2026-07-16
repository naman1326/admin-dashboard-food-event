# Swarajya Website Design & Styling Guide

This guide documents the design system, styling patterns, typography, colors, layout mechanisms, components, and animations used throughout the **Swarajya Website** codebase.

---

## 🎨 1. Color Palette & Gradients

The site employs a vibrant, culture-rich aesthetic with warm, deep Maharashtrian heritage accents (saffrons, crimsons, oranges) contrasted with glassmorphic elements and clean neutral shades.

### Primary Accents & Brand Colors
* **Marathi Identity Red:** `#D62424` (used for logos, brand identity, primary buttons, and hover transitions)
* **Hover Accent Red:** `#B01E1E` (used for primary button hover states)
* **Vibrant Saffron/Orange:** `#FF6B35` (used for titles, decorative underlines, timeline indicators, and gradient stops)
* **Alt Saffron:** `#ff9933` / `#ea580c` / `#f97316` (used in splash screens, blog backgrounds, and gallery filters)
* **Secondary Brand Accent:** `#dc2626` / `#b91c1c` / `#9a3412` (used for Devanagari text shadowing and deep contrast orange-red transitions)

### Neutral Tones
* **Primary Text:** `#333333` (off-black) and `#2c3e50` (deep blue-grey)
* **Muted/Secondary Text:** `#555555`, `#666666`, `#777777`
* **Footer/Dark Theme Text:** `#cccccc`, `#bbbbbb`, `#ffffff`
* **Light Backgrounds:** `#f8f9fa` (light gray sections/cards), `#fff7ed` (warm beige)
* **Pure Whites:** `#ffffff` (cards, section headers, container backgrounds)

### Linear Gradients
* **Warm/Saffron Background Gradient (Splash & Blogs):**
  `linear-gradient(135deg, #fff7ed 0%, #fed7aa 30%, #fdba74 70%, #fb923c 100%)`
* **Deep Saffron/Red Brand Gradient (Achievements, History Timeline):**
  `linear-gradient(135deg, #FF6B35 0%, #D62424 100%)`
* **Dark Footer Background:**
  `linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)`
* **Creative Blog Header Background:**
  `linear-gradient(135deg, #f97316 0%, #ea580c 25%, #dc2626 50%, #b91c1c 75%, #991b1b 100%)`
* **Purple/Indigo Gradient (Flagship Title):**
  `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
* **Orange Badge Gradient:**
  `linear-gradient(135deg, #ff6b6b, #ee5a24)`

---

## ✍️ 2. Typography & Custom Fonts

The website uses a hybrid typography approach that balances modern web aesthetics with traditional Marathi script.

### Devanagari & Culturally-Inspired Fonts
* **Yatra One & Kalam:** Used for stylized title elements and Sanskrit/Devanagari scripts (e.g. splash screen, logo texts).
* **Infinity Font:** Loaded via a custom `@font-face` from the public directory:
  ```css
  @font-face {
    font-family: 'Infinity';
    src: url('../../public/Infinity-05.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
  ```
* **Noto Sans Devanagari:** Used for clean Devanagari text representation.

### English & UI Fonts
* **Poppins & Playfair Display:** Used in creative areas like Blogs and Gallery titles to provide a sleek, magazine-like premium feel.
* **Inter & Segoe UI:** Used as default UI body fonts for readability and clean scaling.
* **Scale-flexible Headings:** The codebase implements `clamp()` for responsive font sizing:
  `font-size: clamp(2rem, 8vw, 5rem);`

---

## 🗂️ 3. Layout Systems & Containers

### Grid Systems
* **Responsive Feature Cards Grid:**
  ```css
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  ```
* **Achievements & Columns:** Utilizes CSS Grid split views (`grid-template-columns: 1fr 1fr;` falling back to `1fr` on tablet/mobile views).

### Glassmorphism Navigation Menu
The navigation menu creates a premium glassmorphic feel using background transparency combined with backdrop filters:
```css
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 50px;
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
```

### Containers
* Standard wrapper width: Max-width of `1200px` (or `1400px` for gallery grids).
* Centered layouts: `margin: 0 auto; padding: 0 20px;` (box-sizing is set to `border-box`).

---

## 🎛️ 4. UI Components & Interactive Patterns

### Buttons (`.btn`)
* **Pill-shaped:** All buttons utilize `border-radius: 50px` for a modern, approachable feel.
* **Primary Button:** Active red with drop shadows (`box-shadow: 0 4px 15px rgba(214, 36, 36, 0.3)`) translating up on hover:
  ```css
  .btn-primary:hover {
    background: #B01E1E;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(214, 36, 36, 0.4);
  }
  ```
* **Secondary / Outlined Button:** Transparent background, white border. On hover, background fills white and text shifts to red/accent.

### Cards & Hover States
* Feature and Event cards employ high-quality drop shadows (`box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08)`).
* Card elements lift up on hover (`transform: translateY(-5px)`).
* Several cards feature a hidden top border indicator that scales on hover:
  ```css
  .feature-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, #FF6B35, #D62424);
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }
  .feature-card:hover::before {
    transform: scaleX(1);
  }
  ```

### Timeline Layout
* A central decorative timeline utilizes a linear gradient line:
  `background: linear-gradient(180deg, #FF6B35, #D62424)`
* Timeline nodes alternate left and right (`flex-direction: row-reverse` for even nodes).

---

## 📱 5. Responsive Design Breakpoints

Responsive rules are defined in localized media queries across CSS files:
1. **Desktop Large (>1200px):** Enhanced gaps (`gap: 2.5rem`), font-size scaling.
2. **Tablet (<768px):**
   * Grid views collapse to single-column (`grid-template-columns: 1fr`).
   * Main menu fades/slides off-screen and becomes toggleable via hamburger menu button.
   * Mobile menu overlays use high opacity backgrounds: `background: rgba(0, 0, 0, 0.95); backdrop-filter: blur(15px);`.
3. **Mobile (<480px):** Padding reduces (`padding: 0 15px`), hero headings scale down for better layout fitting.
4. **Extra Small (<360px):** Logo text size adjustments and tighter font size scaling.

---

## 💫 6. Micro-animations & Visual FX

* **Floating Elements (`float`):** Subtle floating background movements (`@keyframes float`).
* **Title Glowing/Shimmering FX:** Used on blogs to shift colors and add background glows.
* **Sparkling/Confetti Effects:** The splash screen loads dynamic dropping particles using confetti keyframes:
  ```css
  @keyframes confettiFall {
    0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
  }
  ```
* **Bouncing Indicators:** Chevron indicators feature keyframe bounce offsets (`transform: translateY(10px)`) to draw user attention to scroll-down prompts.
* **Scroll-Trigger transitions:** The header responds to scroll depth, transforming away (`translateY(-100%)`) or shrinking its logo assets on scrolled states.
