# Land Purchase System – Backend Setup (Step-by-step with Supabase)

Follow these steps exactly. You’ll go from zero to a working backend using Supabase (cloud PostgreSQL) and your local Node/Express server.

---

## 1) Install tools
- Install Node.js 18+ from nodejs.org
- Optional: Install Git (recommended)

Open a terminal in the project folder:
```bash
npm install
```

---

## 2) Create a Supabase project (free)
1. Go to https://supabase.com and Sign up / Log in.
2. Click "New project".
3. Choose a name and a strong database password.
4. Select the Free plan and create the project.
5. Wait for the project to finish provisioning (~1–2 minutes).

---

## 3) Get your Supabase credentials
1. In your Supabase project dashboard, go to Settings → API.
2. Copy the Project URL (looks like https://rsmyjzjcmldphrngxohu.supabase.co).
3. Copy the service_role key (under "Project API keys"). This is secret; do not share.

Create a file named `.env` in your project root and paste:
```bash
SUPABASE_URL=https://rsmyjzjcmldphrngxohu.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbXlqempjbWxkcGhybmd4b2h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTYzNzUxNCwiZXhwIjoyMDc3MjEzNTE0fQ.u0E7Sl2VrXmMBaChRfDIDroRpV_cMoZCNLc-a5XX-uI
PORT=3000
NODE_ENV=production
```
Replace the two placeholders with your real values.

On Windows (CMD/PowerShell), just create `.env` with Notepad:
- CMD: `notepad .env`
- Paste the values, save.

---

## 4) Create the database tables
In Supabase, open the SQL Editor and run this SQL (copy/paste as-is):
```sql
create table if not exists buyers (
  id serial primary key,
  name text not null,
  id_number text unique not null,
  phone text not null,
  email text not null,
  address text,
  occupation text,
  budget numeric(10,2) not null,
  created_at timestamp default current_timestamp
);

create table if not exists plots (
  id integer primary key,
  status text not null default 'available' check (status in ('available','selected','sold')),
  price numeric(10,2) not null default 65800.00,
  buyer_id integer references buyers(id),
  sold_date timestamp
);

create table if not exists transactions (
  id serial primary key,
  buyer_id integer not null references buyers(id),
  plot_ids text not null,
  total_amount numeric(10,2) not null,
  payment_status text default 'pending' check (payment_status in ('pending','completed','failed')),
  notes text,
  created_at timestamp default current_timestamp
);
```
Click Run. You should see "success".

---

## 5) Seed 200 plots (run once)
Run this SQL in the same SQL Editor:
```sql
with presold as (
  select unnest(array[3,7,8,15,19,32,47,88,101,120,155,172,199]) as id
)
insert into plots (id, status, price)
select g as id,
       case when p.id is not null then 'sold' else 'available' end as status,
       65800.00
from generate_series(1,200) as g
left join presold p on p.id = g
on conflict (id) do nothing;
```
This seeds IDs 1–200 with demo pricing.

---

## 6) Row Level Security (RLS)
For a quick start, either:
- Turn OFF RLS for `buyers`, `plots`, `transactions` (Table editor → table → RLS switch), or
- Keep RLS ON and add a permissive policy for the service role (advanced; you can skip now).

If you see 401/403 errors later, it’s usually RLS blocking writes.

---

## 7) Start the backend server
From the project folder:
```bash
npm start
```
Expected logs:
```
Using Supabase (PostgreSQL cloud database)
✓ Database initialized
✓ Server running on http://localhost:3000
  API available at http://localhost:3000/api
```
If you see "Using SQLite", your `.env` wasn’t picked up. Re-check SUPABASE_URL and SUPABASE_KEY.

---

## 8) Test the API
Option A (browser): open `test-api.html` and click the buttons (Plots, Stats, Buyers, Transactions).

Option B (terminal):
```bash
curl http://localhost:3000/api
curl http://localhost:3000/api/plots
curl http://localhost:3000/api/plots/stats
```

---

## 9) Open the app UI
- Start server: `npm start`
- Then open: `http://localhost:3000/app`

The frontend calls `http://localhost:3000/api` automatically. When you select plots and complete a purchase, the app will:
- Create/find the buyer by `id_number`
- Mark selected plots as `sold` with `buyer_id`
- Create a transaction record

---

## 10) Common fixes
- Buyers 409 error: a buyer with that `id_number` already exists. Use a different ID or update the existing buyer.
- Can’t write to tables: disable RLS or add policies for service role.
- Server shows SQLite: `.env` missing/incorrect. Ensure `.env` lives in the project root and restart.
- CORS: already enabled in server; just use the same origin `http://localhost:3000` for the UI and API.

---

## 11) What was already set up for you
- A unified DB adapter that switches to Supabase when `SUPABASE_URL` and `SUPABASE_KEY` exist.
- Routes for plots, buyers, transactions now use that adapter.
- Express serves your frontend at `/app` and exposes API at `/api`.

You’re done. Start the server, open `/app`, and begin using your system with Supabase.
