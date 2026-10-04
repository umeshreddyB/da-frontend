# System Design Study Plan — Frontend

React + Vite app for a 120-day system design study plan: dashboard (graph, calendar, tasks), roadmap, progress analytics, and knowledge notes with per-subtopic editing.

> Deploy **this repo on Vercel only**. The API runs on **Render** — see [backend DEPLOY.md](https://github.com/kammari-venkatesh/system-design-todobackend/blob/main/DEPLOY.md).

## Requirements

- Node.js 18+

## Setup

```bash
npm ci
cp .env.example .env
npm run dev
```

App runs at `http://localhost:5173`. In development, API requests are proxied to `http://localhost:5000`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Production | Backend URL without trailing slash |

**Local dev:** leave `VITE_API_URL` empty — Vite proxies `/api` and `/uploads`.

**Production:** `https://system-design-todobackend-1.onrender.com` (also set in `.env.production` and `vercel.json`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |

## Deploy (Vercel)

1. Import [system-design-todo](https://github.com/kammari-venkatesh/system-design-todo) on [Vercel](https://vercel.com).
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variable (optional — already in `vercel.json`):
   `VITE_API_URL=https://system-design-todobackend-1.onrender.com`
6. Deploy

`vercel.json` handles SPA routing.

## Deploy (Netlify)

1. Build command: `npm run build`
2. Publish directory: `dist`
3. Set `VITE_API_URL` in environment variables
4. `netlify.toml` handles SPA redirects

## Production checklist

After deploying frontend and [backend](https://github.com/kammari-venkatesh/system-design-todobackend):

| Service | Variable | Value |
|---------|----------|-------|
| Frontend | `VITE_API_URL` | `https://system-design-todobackend-1.onrender.com` |
| Backend | `FRONTEND_URL` | `https://*.vercel.app` (auto-default) or your exact Vercel URL |
| Backend | `PUBLIC_URL` | Auto from Render (`https://system-design-todobackend-1.onrender.com`) |
| Backend | `NODE_ENV` | `production` |
| Backend | `MONGO_URI` | MongoDB Atlas connection string |
| Backend | `JWT_SECRET` | Long random secret |

Run `npm run seed` once on the backend after first deploy to load the study plan.

## Features

- **Dashboard** — progress graph, calendar, daily tasks, knowledge notes
- **Roadmap / Progress** — separate pages with study plan and analytics
- **Knowledge notes** — per-day summary + one note per study subtopic (auto-created from plan tasks), auto-saved to MongoDB
