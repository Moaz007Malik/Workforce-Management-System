# Workforce Management System

A modern SaaS-style MERN platform for enterprise workforce management, resource planning, budget tracking, and executive reporting.

![Stack](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Express](https://img.shields.io/badge/Express-4-green) ![Tailwind](https://img.shields.io/badge/Tailwind-4-blue)

## Features

### Core Modules
- **Executive Dashboard** — KPI cards, Recharts visualizations, profitability analysis
- **Project Management** — Full lifecycle with WBS tree view (Project → Phase → Milestone → Task)
- **Task Management** — Drag-and-drop Kanban board powered by DnD Kit
- **Resource Planning** — Utilization tracking with capacity forecasting
- **HR Management** — Employee profiles, skills, availability, leave tracking
- **Timesheets** — Submission and manager approval workflow
- **Budget Management** — Planned vs actual cost with health indicators
- **Reports** — Export to PDF and CSV
- **Risk & Issue Registers** — Per-project risk and issue tracking
- **Notifications & Audit Logs** — Real-time alerts and action history

### Enterprise Features
- **Capacity Planning & Forecasting** — Weekly capacity forecast warns PMs before overallocating resources (e.g., "Employee A is 35/40h — assigning 8h more exceeds capacity")
- **Resource Assignment Engine** — Skill match scoring with utilization-aware suggestions
- **Profitability Engine** — Automatic profit margin calculation per project
- **Budget Health** — Green/Yellow/Red indicators based on consumption

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| UI | Tailwind CSS 4, ShadCN-style components, Lucide Icons |
| State | Zustand |
| Charts | Recharts |
| Drag & Drop | DnD Kit |
| Backend | Node.js, Express |
| Database | MongoDB (MongoDB Atlas cloud) |

## Quick Start

### Prerequisites
- Node.js 18+
- npm
- MongoDB Atlas cluster (free tier works) or local MongoDB

### Installation

```bash
# Clone and install
npm run install:all

# Configure database connection
cp backend/.env.example backend/.env
# Edit backend/.env and set MONGODB_URI (database name: workforce_management)

# Start both servers
npm run dev
```

### MongoDB Atlas setup

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user (username + password)
3. Allow your IP in **Network Access** (or `0.0.0.0/0` for development)
4. Copy the connection string from **Connect → Drivers**
5. Paste it into `backend/.env` as `MONGODB_URI`, replacing `<password>` and using the database name **`workforce_management`**

```env
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/workforce_management?retryWrites=true&w=majority
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### Demo Data

Demo seeding is **disabled by default**. When you are ready to load sample data into `workforce_management`, set `ALLOW_SEED=true` in `backend/.env` and run `cd backend && npm run seed` once.

- 10 Employees across 4 departments
- 5 Projects with phases and milestones
- 50 Tasks with realistic allocations
- 100 Timesheet entries
- 10 Risks and 10 Issues
- Notifications and audit logs

## Project Structure

```
Workforce-Management-System/
├── backend/
│   ├── config/            # MongoDB connection
│   ├── models/            # Mongoose schemas
│   ├── repositories/      # MongoDB repository layer
│   ├── routes/            # Express API routes
│   ├── services/          # Business logic & calculations
│   └── utils/seed.js      # Demo data generator
├── frontend/
│   ├── src/
│   │   ├── components/    # UI, layout, feature components
│   │   ├── pages/         # Route pages
│   │   ├── stores/        # Zustand state management
│   │   ├── lib/           # Utilities & API client
│   │   └── types/         # TypeScript interfaces
│   └── ...
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Executive dashboard metrics |
| GET/POST/PUT/DELETE | `/api/projects` | Project CRUD |
| GET | `/api/projects/:id/details` | Project with WBS, risks, budget |
| GET/POST/PUT/DELETE | `/api/tasks` | Task CRUD (Kanban updates) |
| GET | `/api/assignees/suggestions` | Resource assignment suggestions |
| GET | `/api/employees/:id/capacity` | Weekly capacity forecast |
| GET | `/api/employees/:id/profile` | Employee profile page data |
| GET | `/api/reports/:type` | Generate reports |
| GET | `/api/notifications` | User notifications |
| GET | `/api/audit-logs` | System audit trail |

## Key Formulas

**Utilization %** = Allocated Hours / Capacity Hours × 100

**Planned Cost** = Estimated Hours × Hourly Rate

**Actual Cost** = Actual Hours × Hourly Rate

**Profit Margin %** = (Revenue − Cost) / Revenue × 100

**Budget Health**:
- 🟢 Green — Under budget
- 🟡 Yellow — Within 10% of budget
- 🔴 Red — Over budget

## Deploy on Vercel

Deploy as **two separate Vercel projects** (frontend + backend).

### 1. MongoDB Atlas (production)

In Atlas → **Network Access**, allow **`0.0.0.0/0`** (required — Vercel uses dynamic IPs).

Use a **new** Atlas database named `workforce_management` in your connection string. Demo seeding is disabled by default — do not run `npm run seed` until you set `ALLOW_SEED=true` in `backend/.env`.

### 2. Backend project (Vercel)

1. Import the repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `backend`
3. Add **Environment Variables**:

| Variable | Value |
|----------|--------|
| `MONGODB_URI` | Your Atlas connection string |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` (set after frontend deploy) |
| `NODE_ENV` | `production` |

4. Deploy → note the URL, e.g. `https://wms-api.vercel.app`
5. Test: `https://wms-api.vercel.app/health`

### 3. Frontend project (Vercel)

1. Create a **second** Vercel project from the same repo
2. Set **Root Directory** to `frontend`
3. Add **Environment Variables**:

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `https://wms-api.vercel.app/api` |

4. Deploy → note the URL, e.g. `https://wms.vercel.app`
5. Go back to the **backend** Vercel project → update `FRONTEND_URL` to your frontend URL → **Redeploy**

### Local environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| File | Purpose |
|------|---------|
| `backend/.env` | `MONGODB_URI`, `FRONTEND_URL`, `PORT` |
| `frontend/.env` | `VITE_API_URL` (empty locally = Vite proxy to `:3001`) |

`.env` files are gitignored. Use `.env.example` as the template; set real values in Vercel **Settings → Environment Variables**.

## License

MIT — Prototype for demonstration purposes.
