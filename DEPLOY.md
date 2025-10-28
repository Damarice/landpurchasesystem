# Deploy Guide (Netlify + Supabase + Hosted Backend)

This guide shows how to deploy your app so users can buy plots using Supabase.

---

## Part A — Deploy the Backend API (Render)
Your Express server must be online for the frontend to create buyers, mark plots sold, and save transactions.

1) Create a free account at https://render.com
2) Click “New +” → “Web Service”.
3) Connect your Git repo (or use “Public Git repo” and paste the repo URL).
4) Service settings:
   - Name: land-purchase-api (any)
   - Branch: main (or your branch)
   - Runtime: Node
   - Build command: (leave empty)
   - Start command: `npm start`
5) Environment Variables (add these):
   - `SUPABASE_URL` = your Supabase project URL (e.g., https://YOUR-PROJECT.supabase.co)
   - `SUPABASE_KEY` = your Supabase service_role key (secret)
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render assigns a port; using 10000 is fine)
6) Click “Create Web Service” and wait for deploy to finish.

### Get your Backend URL
- In your Render service page, copy the URL at the top (e.g., `https://your-api.onrender.com`).
- Your API base will be: `https://your-api.onrender.com/api`.

### Test the Backend
Open these in your browser:
- `https://your-api.onrender.com/api`
- `https://your-api.onrender.com/api/plots`
- `https://your-api.onrender.com/api/plots/stats`

If you see JSON responses, your backend is live and connected to Supabase.

---

## Part B — Point the Frontend to the Backend
We already updated the client to read a configurable API base URL.

In `index.html`, add this inside `<head>` (before your scripts):
```html
<script>
  window.API_BASE_URL = 'https://your-api.onrender.com/api';
</script>
```
Replace with your actual backend URL from Render.

If you deploy only the backend and want a single URL for both UI and API, your server already serves the app at `/app`. Users can visit:
- `https://your-api.onrender.com/app` (no extra config needed in that case)

---

## Part C — Deploy the Frontend (Netlify)
Option A: Drag & Drop
1) Go to https://app.netlify.com → “Add new site” → “Deploy manually”.
2) Drag your project folder (with `index.html`, `style.css`, `api-client.js`, `app-backend.js`).

Option B: Connect Git
1) “Add new site” → “Import an existing project”.
2) Select your repo. No build command needed (static site). Publish directory: repo root.

### Get your Netlify URL
- After deploy, Netlify shows a URL like `https://your-site.netlify.app`.
- Share that URL with users. The site will call your Render API via `window.API_BASE_URL`.

---

## Optional — Single URL (no Netlify)
If you prefer one URL only:
- Deploy just the backend on Render (Part A) and share `https://your-api.onrender.com/app`.
- Remove the `window.API_BASE_URL` script; the client auto-uses same-origin `/api`.

---

## Troubleshooting
- EADDRINUSE locally: another app is using port 3000. Close other Node terminals or set a different `PORT` in `.env`.
- 401/403 from Supabase: disable Row Level Security for `buyers`, `plots`, `transactions` (quick start) or add permissive policies for the service role.
- CORS: backend enables CORS; Netlify + Render should work by default.
- Wrong API URL: make sure the URL in `window.API_BASE_URL` ends with `/api` and matches your Render service URL.

---

## Links
- Supabase Dashboard: https://supabase.com/dashboard
- Render Dashboard: https://dashboard.render.com/
- Netlify Dashboard: https://app.netlify.com/
