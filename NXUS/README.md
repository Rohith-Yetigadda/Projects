<div align="center">

# ⬡ NXUS

### *A Premium Habit Tracking Experience*

[![Live Site](https://img.shields.io/badge/▶_Live_App-nxus--tracker.vercel.app-000?style=for-the-badge&logo=vercel&logoColor=white)](https://nxus-tracker.vercel.app/)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=000)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-DD2C00?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)

---

A fully private, cloud-synced habit tracker built from scratch with **React 19** and **Firebase**.  
No templates. No component libraries. Every pixel hand-crafted with vanilla CSS.

<br>

[**🔗 Launch NXUS →**](https://nxus-tracker.vercel.app/)

</div>

---

## 🎬 Demo

<div align="center">

[![NXUS Demo Video](https://img.shields.io/badge/▶_Watch_Demo_Video-FF0000?style=for-the-badge&logo=googledrive&logoColor=white)](https://drive.google.com/file/d/187KQXgh1QzTIJmIh596r6i13kxQXzInw/view?usp=sharing)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📊 Dashboard & Analytics
- **Activity Graph** — Smooth Catmull-Rom spline chart tracking daily net scores with interactive tooltips
- **Analytics Rings** — SVG donut rings for Efficiency, Momentum & Completion metrics
- **Streak Counter** — Real-time streak tracking with month-end carryover
- **Personal Best** — All-time high score tracking with animated progress bar

</td>
<td width="50%">

### 🎨 Customization Engine
- **Dark / Light Mode** — Full theme system with smooth transitions
- **5 Accent Palettes** — Mint, Ocean, Violet, Coral & Sunset color schemes
- **Compact View** — Toggle between comfortable and dense table layouts
- **Responsive Design** — Optimized for desktop, tablet & mobile

</td>
</tr>
<tr>
<td width="50%">

### 📅 Habit Management
- **Positive & Negative Habits** — Track both goals and habits to break
- **Importance Levels** — Low, Medium, High priority badges
- **Monthly Goals** — Set per-habit targets and track progress
- **Inline Editing** — Rename habits, change types & reorder on the fly

</td>
<td width="50%">

### ☁️ Cloud & Data
- **Firebase Auth** — Secure Google sign-in with persistent sessions
- **Firestore Sync** — Real-time cloud persistence across all devices
- **CSV Export** — One-click monthly data export
- **Sync from Last Month** — Carry forward habit configs seamlessly
- **Full Data Reset** — Complete account data wipe when needed

</td>
</tr>
</table>

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 + React Router 7 |
| **Build Tool** | Vite 8 |
| **Styling** | 100% Vanilla CSS — no Tailwind, no UI libraries |
| **Icons** | Lucide React |
| **Auth** | Firebase Authentication (Google OAuth) |
| **Database** | Cloud Firestore |
| **Hosting** | Vercel (Edge Network) |

---

## 🏗 Architecture

```
src/
├── components/          # Reusable UI components
│   ├── ActivityGraph    # SVG spline chart with hover/touch interaction
│   ├── AnalyticsRings   # Donut ring progress indicators
│   ├── AppLayout        # Main layout orchestrator + state manager
│   ├── HabitTable       # Core habit grid with checkbox matrix
│   ├── Header           # Top bar with date picker & score display
│   ├── HeatmapGrid     # Monthly activity heatmap (sidebar)
│   ├── SideMenu         # Slide-out navigation & settings panel
│   ├── FooterCounter    # Bottom stats bar with add-habit action
│   └── ...              # ConfirmModal, Dropdown, ProtectedRoute
│
├── pages/
│   ├── DashboardPage    # Main app view
│   ├── LoginPage        # Auth gate with Google sign-in
│   └── SettingsPage     # Profile, insights & data management
│
├── context/             # React Context providers (Auth, etc.)
├── hooks/               # Custom hooks (useAppConfig, etc.)
├── services/            # Firebase configuration & API layer
├── styles/              # Global CSS + light mode + responsive breakpoints
└── utils/               # Helper functions & utilities
```

---

## 🚀 Quickstart

### Prerequisites
- Node.js **18+**
- A Firebase project with **Authentication** and **Firestore** enabled

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Rohith-Yetigadda/Projects.git
cd Projects/NXUS

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Fill in your Firebase credentials (see below)

# 4. Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the project root with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

---

## 📦 Deployment

```bash
npm run build
```

Deploy the generated `/dist` directory to any static host. For **Vercel**:

1. Connect your GitHub repository
2. Set the **Root Directory** to `NXUS`
3. Add all environment variables in the Vercel dashboard
4. Deploy — Vercel handles the rest automatically

---

## 📄 License

This project is private and intended for personal use.

---

<div align="center">

**Built by [Rohith Yetigadda](https://github.com/Rohith-Yetigadda)**

*v1.2.1*

</div>
