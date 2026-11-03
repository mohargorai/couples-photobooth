# [Couples Photobooth](https://mohargorai.github.io/couples-photobooth/)

> 
> *made by mohar with love for gungun <3 I love you baby <3*

A bespoke, production-ready, interactive virtual couples photobooth web application designed as a romantic keepsake, handcrafted with love by **Mohar** for **Gungun**. Features live multiplayer peer-to-peer co-op rooms, advanced camera hardware controls, a 4-cut pose inspiration guide, 8 handcrafted border frame presets, 16 custom hand-drawn SVG stickers, and high-DPI Canvas export.

---

## Key Features & Capabilities

### 1. Two-Phase Balanced Studio Workflow
- **Phase 1: Pose & Shoot** — Focuses purely on framing, device selection, orientation adjustments, countdown timers, and capturing the 4 sequential shots.
- **Phase 2: Decorate Strip** — Seamlessly transitions to the creative studio for selecting frames, applying hand-drawn stickers, typing romantic handwritten notes, and choosing typography ink.
- **Live Interactive Strip Preview** — Always accessible on the right pane (desktop) or below controls (mobile/tablet), maintaining continuous visual feedback.

### 2. Advanced Camera Hardware & Multi-Axis Orientation Controls
- **Camera Device Enumerator:** Seamlessly switch between connected cameras (integrated webcams, external USB webcams, OBS Virtual Camera, front/back mobile cameras) via an inline dropdown without reloading the page.
- **Horizontal Mirror Toggle (`Mirror X`):** Mirror live preview along the X-axis (`scaleX(-1)`) for a natural selfie-mirror reflection.
- **Vertical Flip Toggle (`Flip Y`):** Flip along the Y-axis (`scaleY(-1)`) for inverted external webcams or tripod mounts.
- **90° Step Rotation (`0° / 90° / 180° / 270°`):** Instant step rotation to correct sideways feeds on mobile mounts or portrait monitors.
- **Sensor Zoom & Framing Tools:** Smooth 0.5× to 1.4× zoom slider with quick presets (`0.75x Wide`, `1.0x Reset`) and a `Fit Full` / `Fill Fit` sensor aspect toggle.
- **100% Canvas Matrix Sync:** Context transformations (`ctx.translate`, `ctx.rotate`, `ctx.scale`) and center-crop math are mathematically synchronized so captured photo strips match the live preview 1:1 with zero distortion.

### 3. Live Multiplayer "Together Room" System (Shareable Link Co-Op)
- **Zero-Backend Peer-to-Peer:** Powered by PeerJS (WebRTC media streams and high-speed data channels) requiring no complex database backend.
- **Instant Room Creation:** Generates a romantic room ID (e.g. `rose-4892`) and automatically updates URL query parameters (`?room=rose-4892`).
- **One-Tap Link Copy:** Copy invite link with a bespoke hand-drawn ribbon toast notification (*"Invite link copied! Send this to her"*).
- **Dual Live Viewfinder:** Host on the Left, Partner on the Right, with synchronized orientation transforms and side-by-side duo framing.
- **Synchronized Countdown & Capture:** Tapping "Take Our Photos Together" broadcasts a `START_COUNTDOWN` event across the data channel so both screens count down, flash, and capture at the exact same millisecond.
- **Real-Time Customization Sync:** Changes to border frames, stickers, ink colors, and captions sync live between partners.

### 4. Photobooth Pose Ideas & Sample Cuts Guide
- **Curated 4-Cut Posing Inspiration:**
  - **Cut 1: Cheek Heart** — Curve hand against cheek into a sweet half heart.
  - **Cut 2: Wink & Peace** — Playful two-finger V peace sign with a soft wink.
  - **Cut 3: Flower Blossom** — Cup chin in both hands like a blooming flower.
  - **Cut 4: Cozy Lean** — Tilt heads together with warm, cozy smiles.
- **One-Tap Demo Illustration:** "Fill Strip with Sample Photos" instantly populates the strip with 4 rich, watercolor-tinted illustrated keepsake photos with personalized handwritten titles.

### 5. Expanded Customization Studio & Presets
- **8 Handcrafted Border Styles:**
  1. **Milky Cream Classic:** Warm off-white gallery border with subtle paper grain texture.
  2. **Baby Pink Gingham:** Soft woven pastel pink-and-white checkered picnic pattern.
  3. **Soft Berry Polka Dot:** Milky white frame scattered with hand-drawn soft red dots.
  4. **Coquette Scalloped Lace:** Delicate lace trim and eyelet cutouts along frame edges.
  5. **Satin Ribbon Weave:** Interlacing baby pink ribbon borders with corner loops.
  6. **Vintage Air-Mail Love Letter:** Soft red and baby pink diagonal envelope stripes.
  7. **Blush Watercolor Wash:** Organic soft-edged pastel rose and cream gradients.
  8. **Warm Cocoa Film Strip:** Vintage dark-brown photobooth strip with cream accents.
- **Romantic Caption Presets:** One-tap quick pills (*"missing you a little extra today"*, *"together from afar"*, *"my favorite person"*, *"counting down the days until I see you"*, *"always yours"*, *"our little photobooth date"*) + custom text input with automatic date stamp.
- **Typography & Ink Switcher:** 3 romantic handwritten Google Fonts (`Caveat`, `Sacramento`, `Indie Flower`) and 3 ink tones (`#5A3E42`, `#D85A67`, `#C47A87`).
- **16 Custom Hand-Drawn SVG Stickers:** 0 emojis; 16 detailed vector illustrations (coquette bows, twin hearts, wax seals, paper airplanes, cherries, strawberries, locket, blush marks, and sakura petals).
- **Collision-Free Controls & Dynamic Sizing:** Rotate antenna stem floating 28px above top center, separate delete and scale handles, dynamic counter-scaling (`scale(1 / S)`) for consistent 28px touch targets, and subtle `drop-shadow` for high contrast on light and dark frames.
- **4 One-Tap Layout Presets:** "Bow Overload", "Love Letter Set", "Soft & Minimal", and "Clear".

### 6. High-DPI Canvas Rendering & Mobile Camera Roll Export
- Multi-layer canvas compositor renders photos, borders, stickers, custom fonts, and watermarks at 2× device pixel ratio (`1200x3600` canvas resolution).
- Supports direct save to device camera roll via the native Web Share API on iOS/Android, with automatic fallback to high-resolution PNG download.

---

## Aesthetic System

- **Color Palette:**
  - Milky Cream (`#FFF9FB`) & Soft Alabaster (`#FFFFFF`)
  - Baby Pink (`#FFD1DC`) & Pastel Rose (`#F8BBD0`)
  - Soft Berry Red (`#D85A67`)
  - Warm Cocoa Brown (`#5A3E42`)
  - **Strictly ZERO pure black (`#000000`).**
- **Strict Anti-AI-Slop & Zero-Emoji Rule:**
  - 0 raw Unicode emoji characters anywhere in the UI or codebase.
  - All icons and stickers are custom-coded inline SVG illustrations.

---

## Screen Size Responsiveness

| Device Class | Viewport Width | Layout Behavior |
| :--- | :--- | :--- |
| **Mobile Phones** | `< 480px` | Single-column flow, 2-phase workflow tabs, stacked camera controls, 2×2 shot retake tiles, full-width touch targets. |
| **Phablets & Small Tablets** | `480px – 768px` | Single-column fluid layout, 4-column frame picker, comfortable side-by-side slot buttons. |
| **Tablets & Small Laptops** | `768px – 992px` | Collapsed single-column studio layout, sticky navigation header, full-width preview dispenser. |
| **Desktops & Widescreens** | `> 992px` | Two-column creative studio: controls on left, sticky photobooth strip stage on right. |

---

## Quick Start

```bash
# Start local server
node server.js
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Run Automated QA Verification
```bash
node test_qa_passes.js
```
All 4 verification passes (Camera Transform Matrix, Multiplayer PeerJS Room & Routing, Presets & 16 SVGs, Touch & Responsive Layout) run and validate in under 1 second.

---

*made by mohar <3 for gungun <3*
