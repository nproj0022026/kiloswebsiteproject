# Project K.I.L.O.S. Website

Development Plan & Milestones

## Overview

This document outlines the development milestones, feature requirements, and technology stack for building the Project K.I.L.O.S. companion website — a resource for adults with hypertension in Barangay Tarum, Mercedes, Camarines Norte, accessed via a QR code included in the printed booklet.

## Requirements

- Informative introduction to hypertension and why BP monitoring/management matters
- Possible complications of uncontrolled blood pressure
- Healthy lifestyle tips
- Warning signs and normal blood pressure level reference
- DASH (Dietary Approaches to Stop Hypertension) diet guidance
- Emergency action plan for family members
- Emergency care service information
- Weekly health goals feature
- Mobile-friendly design or responsive to any size, since most participants will access via phone through the booklet's QR code

## Tech Stack

- **HTML5 / CSS3 / JavaScript** — Core build — no framework overhead needed
- **Tailwind CSS (CDN, with `forms` and `container-queries` plugins)** — Utility-first styling. A custom `tailwind.config` in `main.js` defines the site's color tokens (Material 3–style palette — primary/surface/error/tertiary roles, etc.), spacing scale, and typography (headline/body/label styles using Lexend + Inter), so every fragment shares one design system.
- **Material Symbols Outlined** — Icon set, loaded via Google Fonts alongside Lexend and Inter.
- **localStorage** — Lightweight persistence for the BP log/history, weekly goals checklist, and user name/greeting preference — no backend needed for a pilot.
- **Hosting/Deployment** — Vercel — free and simple for a static Tailwind/vanilla-JS site.
- **Navigation pattern — "Claude-app" shell:** `index.html` holds a persistent shell (header, bottom nav, welcome modal) that never reloads. A lightweight **hash-based router** in `main.js` (`#/`, `#/about`, `#/tracker`, `#/emergency`) fetches the matching HTML fragment from `pages/` and injects it into `#page-content` on `hashchange`, caching fetched fragments in memory (`pageCache`) so repeat visits don't re-fetch. This keeps nav state, greeting, and layout stable across views and feels closer to a native app than a traditional multi-page site.
- **Nav layout:** top nav bar (desktop, `md:` and up) plus a fixed bottom tab bar (mobile, hidden at `md:`) — both rendered from the same `NAV_ITEMS` list in `main.js` so they can't drift out of sync.

## File Structure
```
KILOS/
├── assets/
│   ├── logo/
│   │   └── kilos-logo.png
│   ├── images/
│   │   └── peoplesmiling.jpg   (Home hero photo — licensed free stock, replaces earlier AI-generated placeholder)
│   └── dash-pdf-files/
│       ├── dash-elevated.pdf   (downloadable DASH guide — Elevated BP category)
│       └── dash-high.pdf       (downloadable DASH guide — High BP category)
├── pages/
│   ├── home.html           (content fragment, fetched into #page-content)
│   ├── about.html          (includes FAQ section)
│   ├── tracker.html        (BP form, history table, urgent card, DASH modal, delete-confirm modal)
│   ├── emergency.html
│   └── faqs.html           (standby — FAQ content currently lives inside about.html instead; route commented out)
├── scripts/
│   ├── main.js              (site-wide: Tailwind config, hash router, header/bottom-nav rendering, welcome modal, shared greeting helpers)
│   └── pages/
│       ├── tracker.js       (BP history + status logic, urgent card, DASH guidance modal, delete-confirm modal, tracker form wiring)
│       ├── about.js         (FAQ accordion — FAQ content lives inside pages/about.html, no active FAQs route)
│       └── faq.js           (standby — for a future standalone FAQs page, if split out from about.js)
├── styles/
│   └── main.css
├── index.html               (persistent shell: header mount, #page-content mount, bottom-nav mount, welcome modal)
└── Project-KILOS-Website-Plan.md
```

`index.html` is the only real "page" — it renders once and stays mounted, and loads `main.js` plus all per-page scripts (`about.js`, `tracker.js`, `faq.js`) up front. `pages/*.html` are content-only fragments (no `<html>`/`<head>`/nav/footer of their own); on every `hashchange`, `main.js`'s router fetches the fragment for the matching route and swaps it into `#page-content`, so the header and bottom nav persist across navigation instead of reloading. Per-page init functions (e.g. `initBpForm`) are re-run after each swap, since fresh `innerHTML` has no event listeners attached; `resetTrackerTransientUI()` is called before every swap so no modal or success/crisis state carries over stale from the previous page.

## Milestones

### 1. Content & Sitemap

Finalize copy for every required section (hypertension overview, DASH diet, warning signs & normal BP ranges, emergency action plan, emergency care info, weekly health goals). Define the sitemap: Home, About Hypertension, DASH Diet Guide, BP Tracker, Emergency Plan, Weekly Goals, Resources/Contact. *(DASH Diet Guide and Weekly Goals are delivered as part of About/Tracker rather than as separate routes — see Milestone 3.)*

### 2. Wireframe & Design System

Sketch a simple wireframe per page: Home, About Hypertension (intro, complications, BP monitoring importance, warning signs & normal BP levels), Emergency Plan (action plan + emergency care info), and Blood Pressure Tracker (input form, reading-based suggestions including DASH tips and weekly goals, and history list). Choose a calming, accessible color palette and typography suited to a health site for a general adult audience. Set up the shared Tailwind config (`tailwind.config` in `main.js`) — color tokens, spacing scale, and headline/body/label type styles — so every page looks consistent.

### 3. Base Layout & Navigation

Build the persistent app shell in `index.html`: header mount (`#site-header`), bottom-nav mount (`#site-bottom-nav`), welcome modal, and a single `#page-content` container — this shell mounts once and never reloads. Nav includes Home, About Hypertension, Blood Pressure Tracker, and Emergency Plan (FAQs route intentionally left commented out for now). Write the hash-based router in `main.js` that, on `hashchange`, fetches the matching HTML fragment from `pages/` and injects it into `#page-content`, updating `document.title`, `document.body.dataset.page`, and active nav state — the "Claude-app pattern" of a fixed shell with a swappable content region instead of separate full-page loads.

Fully build the Home, About Hypertension, and Blood Pressure Tracker fragments as the templates the rest will follow — since Blood Pressure Tracker introduces the name-based, time-of-day greeting (via the welcome modal + `getTimeGreeting()`), the input form + reading-based suggestion logic, and the on-device history list (via localStorage) that the rest of the site's interactivity depends on. **Status: Home hero image updated to a locally hosted, licensed photo (`assets/images/peoplesmiling.jpg`), replacing the original AI-generated/placeholder image URL.**

### 4. Core Content Pages

Build out the DASH Diet Guide, Warning Signs & Normal BP Levels, and Emergency Action Plan as content fragments in `pages/`, following the same shared shell and styling as the Milestone 3 templates. Keep language simple and scannable for a community, non-clinical audience. **Status: DASH Diet content is implemented directly inside the Tracker flow (see Milestone 5) rather than as a standalone page — surfaced contextually via the DASH guidance modal, with matching PDF downloads.**

### 5. Interactive Features

Add the BP self-monitoring log and reading-based guidance, and the Weekly Health Goals checklist. These turn the site from a static pamphlet into a usable tool. **Implemented in `tracker.js`:**

- **BP entry form** (`#bpForm`) — systolic/diastolic input, saved to `localStorage` (`bpHistory`, capped at the 10 most recent readings).
- **4-tier BP status classification** (`getBpStatus`) — Normal, Elevated, High, Crisis — each with its own icon/color treatment.
- **Reading-based response per tier:**
  - *Normal* → inline success state with a short health tip.
  - *Elevated / High* → **DASH guidance modal** with Tagalog-language dos/don'ts, a sample meal plan, and a quick-reference good/avoid food chip list, plus a **downloadable DASH PDF** (`dash-elevated.pdf` / `dash-high.pdf` from `assets/dash-pdf-files/`). This modal doubles as the save confirmation for these two categories.
  - *Crisis* → minimal inline confirmation state, plus a **persistent urgent card** (`syncUrgentCard`) that stays visible on the Tracker page — including on return visits — as long as the most recent saved reading is Crisis-level, prompting the user to contact their BHW.
- **History table** — recent readings with formatted relative timestamps (Ngayon/Kahapon/date) and status badges, plus a **delete-confirmation modal** to clear all history.
- **Weekly Health Goals checklist** — not yet implemented; still to be built as part of this milestone.

### 6. QR Code & Responsiveness

Generate the QR code linking to the site for the printed booklet. Test every page on mobile widths, since most participants will likely access it via phone — confirm the bottom nav, DASH modal, and history table scroll behavior all hold up at small viewport sizes. Fix layout, contrast, and readability issues.

### 7. Testing, Deployment & Handoff

Full click-through test as a participant would experience it, including the BP entry → status → guidance flow across all four status tiers. Deploy as a static site (GitHub Pages, Netlify, or Vercel — router requires being served over http(s), since `fetch()` of local fragment files is blocked under `file://`). Prepare a short handoff note for Barangay Tarum Health Center staff.