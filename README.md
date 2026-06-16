# Workforce Management System

A modern SaaS-style MERN platform for enterprise workforce management, resource planning, scheduling, attendance, and reporting.

> **Requirements reference:** [docs/SOW.md](./docs/SOW.md)  
> **Implementation status:** [docs/MODULE_MAP.md](./docs/MODULE_MAP.md)

## Features

### Core modules
- Executive dashboard — KPIs, charts, PDF export
- Resource & capacity planning — utilization, assignment suggestions
- HR & employee profiles — skills, availability, leave
- Timesheets & attendance — submission, approval, tracking
- Workforce demand (PCP) — planning, approvals, AI insights
- Tasks & projects — scheduling, Kanban, WBS
- Audit logs & notifications — RBAC foundation

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| UI | Tailwind CSS 4 |
| State | Zustand |
| Backend | Node.js, Express |
| Database | MongoDB Atlas (`workforce_management`) |

## Quick start

```bash
npm run install:all

cp backend/.env.example backend/.env
# Set MONGODB_URI — database name: workforce_management

npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### MongoDB

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/workforce_management?retryWrites=true&w=majority
```

### Demo data

Seeding is **disabled by default**. To load sample data later:

```bash
# backend/.env: ALLOW_SEED=true
cd backend && npm run seed
```

## Project structure

```
├── docs/
│   ├── SOW.md
│   └── MODULE_MAP.md
├── backend/
├── frontend/
└── README.md
```

## License

MIT — Development prototype.
