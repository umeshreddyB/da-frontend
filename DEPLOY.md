# Frontend deployment guide (Render)

Deploy **this repo** (`system-design-todo`) on Render. The API runs separately on [system-design-todobackend](https://github.com/kammari-venkatesh/system-design-todobackend).

## Option A — Static Site (recommended)

1. [render.com](https://render.com) → **New** → **Static Site**
2. Connect GitHub repo: `kammari-venkatesh/system-design-todo`
3. Settings:
   - **Branch:** `main`
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `dist`
4. Environment variable:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://system-design-todobackend-1.onrender.com` |

5. **Redirects/Rewrites** (SPA routing):

| Source | Destination |
|--------|-------------|
| `/*` | `/index.html` |

6. Deploy. Copy your site URL (e.g. `https://system-design-todo.onrender.com`).

### Blueprint

Import `render.yaml` via Render **Blueprints** for the same setup.

---

## Option B — Web Service

Use this only if you created a **Web Service** (not Static Site):

| Setting | Value |
|---------|--------|
| **Build Command** | `npm ci && npm run build` |
| **Start Command** | `npm start` |

`npm start` serves the built `dist/` folder. Same `VITE_API_URL` env var as above.

---

## After frontend deploy

On your **backend** Render service (`system-design-todobackend`), set:

| Key | Value |
|-----|-------|
| `FRONTEND_URL` | Your new frontend URL, e.g. `https://system-design-todo.onrender.com` |

Or leave the default `https://*.onrender.com` (already allowed). Redeploy backend if you change env vars.

Run once in backend **Shell** if the plan is empty:

```bash
npm run seed
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Missing script: "start"` on Static Site | Use **Static Site**, not Web Service — no start command needed |
| Blank page / 404 on refresh | Add rewrite `/*` → `/index.html` |
| API errors / CORS | Set `VITE_API_URL` to backend URL; check backend `FRONTEND_URL` |
| Empty study plan | Run `npm run seed` on backend |
