# NXUS | Habit Tracker

A completely private, premium, dynamic habit tracker built tightly with React and Firebase.

## Features

- **1:1 Visual Parity:** Features a striking, bespoke user interface built purely with CSS.
- **Monthly Analytics Engine:** Tracks Efficiency, Momentum, Streak, and Personal Bests.
- **Fully Synchronized:** Firebase authentication and Firestore persistence for bulletproof multi-device data reliability.
- **Customization Engine:** Full Light/Dark mode, 5 bespoke Accent Palettes, and Compact/Comfortable density settings.
- **Data Mobility:** Simple 1-click CSV month exports, sync from previous months, and complete account data wiping.

## Environment Variables

NXUS strictly uses strict `import.meta.env` references. Before spinning up the application, duplicate `.env.example` into a new `.env` file and insert your exact Firebase Project parameters:

```env
VITE_FIREBASE_API_KEY=your_value
VITE_FIREBASE_AUTH_DOMAIN=your_value
VITE_FIREBASE_PROJECT_ID=your_value
VITE_FIREBASE_STORAGE_BUCKET=your_value
VITE_FIREBASE_MESSAGING_SENDER_ID=your_value
VITE_FIREBASE_APP_ID=your_value
VITE_FIREBASE_MEASUREMENT_ID=your_value
```

## Quickstart

To boot the development server immediately:

1. Clone repository
2. Run `npm install` to hydrate package-lock dependencies.
3. Configure your `.env` following `.env.example`
4. Boot the server using Vite with `npm run dev`

## Deployment
Running `npm run build` will compile the React code via Vite into highly optimized chunks. Deploy the `/dist` directory to any static hosting provider (Vercel, Netlify, Firebase Hosting) — don't forget to push your Environment Variables exactly into the deploy configuration GUI beforehand!
