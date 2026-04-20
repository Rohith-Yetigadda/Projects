<div align="center">

# N X U S

**A habit tracker built for precision.**

React 19 · Firebase · Vanilla CSS · Vite 8

<br>

[Live App](https://nxus-tracker.vercel.app/) · [Demo Video](https://drive.google.com/file/d/187KQXgh1QzTIJmIh596r6i13kxQXzInw/view?usp=sharing)

</div>

<br>

---

<br>

## Overview

NXUS is a fully private, cloud-synced habit tracker designed and built from scratch. No component libraries. No template kits. Every surface — from the spline-based activity graph to the animated analytics rings — is hand-built with vanilla CSS and raw SVG.

The interface ships in dark and light themes with five accent palettes, compact density toggles, and full responsive coverage from ultrawide to mobile. Data lives in Firestore with Google OAuth gating access.

<br>

## Core Systems

**Dashboard** — The main view renders an interactive activity graph (Catmull-Rom spline interpolation with hover/touch tooltips), SVG donut rings for Efficiency, Momentum, and Completion, a live streak counter with month-boundary carryover, and a personal best tracker with animated progress.

**Habit Engine** — Supports positive and negative habit types, three importance tiers (Low / Medium / High), per-habit monthly goals with progress bars, and inline renaming. The checkbox matrix handles past/present/future day states with visual distinction.

**Theming** — A full CSS custom property system drives dark/light modes and five color palettes (Mint, Ocean, Violet, Coral, Sunset). Theme preferences sync to Firestore so they follow the user across devices.

**Data Layer** — Firebase Authentication handles sign-in. Firestore persists all habit data, preferences, and display names in real-time. One-click CSV export, sync-from-previous-month, and full account data wipe are built in.

<br>

## Stack

| | |
|:--|:--|
| Framework | React 19, React Router 7 |
| Build | Vite 8 |
| Styling | Vanilla CSS — zero external UI dependencies |
| Icons | Lucide React |
| Auth | Firebase Authentication (Google OAuth) |
| Database | Cloud Firestore |
| Hosting | Vercel |

<br>

## Project Structure

```
src/
├── components/
│   ├── ActivityGraph        Spline chart with interactive tooltips
│   ├── AnalyticsRings       SVG donut progress indicators
│   ├── AppLayout            Root layout + state orchestrator
│   ├── HabitTable           Checkbox matrix with day-state logic
│   ├── Header               Date picker, score display, streak
│   ├── HeatmapGrid          Monthly heatmap in sidebar
│   ├── SideMenu             Navigation, theme controls, user profile
│   ├── FooterCounter        Stats bar + add-habit action
│   ├── ConfirmModal         Reusable confirmation dialog
│   ├── Dropdown             Custom select component
│   └── ProtectedRoute       Auth gate wrapper
│
├── pages/
│   ├── DashboardPage        Main app view
│   ├── LoginPage            Auth screen with Google sign-in
│   └── SettingsPage         Profile, all-time insights, data ops
│
├── context/                 Auth context provider
├── hooks/                   useAppConfig and custom hooks
├── services/                Firebase init and API surface
├── styles/                  Global CSS, light mode, breakpoints
└── utils/                   Helpers and utility functions
```

<br>

## Setup

Requires Node 18+ and a Firebase project with Authentication and Firestore enabled.

```bash
git clone https://github.com/Rohith-Yetigadda/Projects.git
cd Projects/NXUS
npm install
```

Create `.env` from the example template:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

```bash
npm run dev
```

<br>

## Deployment

```bash
npm run build
```

The `/dist` output deploys to any static host. On Vercel: set the root directory to `NXUS`, add the environment variables, and deploy.

<br>

---

<div align="center">

Built by [Rohith Yetigadda](https://github.com/Rohith-Yetigadda) · v1.2.1

</div>
