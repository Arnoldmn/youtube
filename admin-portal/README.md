# Lingua Ops — Admin Portal

A full-stack **React + Node.js** web app for a translation agency:

- **Jobs:** upload jobs with source files, assign them to employees, and get **notified live the moment work is finished**.
- **Employee workspace:** linguists accept or decline jobs, download sources, track progress, upload deliverables and mark jobs finished.
- **Vendor applications:** screen incoming linguists, verify credentials and approve, reject or request more information. Approving can create the vendor's login, so they can be assigned jobs straight away.
- **Team:** add people, set their language pairs and capacity, reset passwords, deactivate accounts.
- **Authentication:** email + password sign-in, admin and employee roles, forced password change for temporary passwords.

| | |
|---|---|
| Frontend | React 19, React Router, Vite |
| Backend | Node.js (≥ 20.6), Express 5 |
| Database | SQLite (one file, no database server to install) |
| Auth | bcrypt-hashed passwords, JWT in an httpOnly SameSite cookie, login rate limiting |
| Live updates | Server-Sent Events (works through normal HTTP proxies) |
| File storage | Local disk (`data/uploads`), downloads checked against job access |

---

## 1. Run it locally (5 minutes)

**You need:** [Node.js 20.6 or newer](https://nodejs.org) (22 LTS recommended). Check with `node -v`.

```bash
cd admin-portal
npm install          # installs server + client
npm run setup        # creates .env with a random secret
npm run dev          # starts the API (:4000) and the React app (:5173)
```

Open **http://localhost:5173** and sign in:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@linguaops.local` | `admin12345` |
| Employee | `lena@linguaops.local` | `password123` |
| Employee | `aiko@linguaops.local` (also `carlos@`, `samuel@`, `nadia@`, `fatima@`, `pieter@`) | `password123` |

The demo data (7 employees, 11 jobs, 16 vendor applications) is loaded automatically the first time you start in development.

### See live notifications

1. Sign in as the **admin** in one browser window.
2. Sign in as **lena@linguaops.local** in a private/incognito window (or another browser).
3. As the admin, click **New job**, drop in a file and assign it to Lena. Lena's bell rings instantly.
4. As Lena, **Accept** the job, then **Mark as finished**, upload a file and **Submit**.
5. The admin gets a "Lena Hoffmann finished JOB-…" alert with a **Review** button, plus a sound and, if enabled, a desktop notification.

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Development mode with hot reload (API + React) |
| `npm test` | API test suite (auth, permissions, uploads, live events, full job lifecycle) |
| `npm run build` | Builds the React app into `client/dist` |
| `npm start` | Runs the production server (serves the API **and** the built React app on one port) |
| `npm run reset-demo` | Wipes the database and uploads, then reloads the demo data |
| `npm run seed` | Creates the admin and demo data in an empty database |

### Run the production build locally

```bash
npm run build
NODE_ENV=production JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") \
ADMIN_PASSWORD='choose-a-strong-one' SEED_DEMO=true npm start
# → http://localhost:4000
```

On Windows PowerShell, put the values in `.env` instead (set `NODE_ENV=production`, `JWT_SECRET=…`, `ADMIN_PASSWORD=…`), then run `npm start`.

### Run with Docker

```bash
JWT_SECRET=$(openssl rand -hex 48) ADMIN_PASSWORD='choose-a-strong-one' docker compose up -d --build
# → http://localhost:4000   (add SEED_DEMO=true to load the sample data)
```

Data lives in the `portal-data` Docker volume, so it survives restarts and upgrades.

---

## 2. Deploy it

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for step-by-step guides:

- **Any Linux server with Docker** (DigitalOcean, Hetzner, AWS Lightsail, …) plus Caddy or nginx for HTTPS
- **Render** (one-click Blueprint, `render.yaml` included)
- **Fly.io** (`fly.toml` included)
- **Railway**
- **Plain Node.js** with PM2 or systemd behind nginx

---

## 3. Configuration

All settings are environment variables. In development they're read from `.env` (see `.env.example`).

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | Use `production` when deployed |
| `PORT` | `4000` | HTTP port |
| `JWT_SECRET` | dev-only value | **Required in production**, 32+ random characters. Changing it signs everyone out. |
| `SESSION_DAYS` | `7` | How long a sign-in lasts |
| `DATABASE_PATH` | `./data/portal.db` | SQLite file |
| `UPLOAD_DIR` | `./data/uploads` | Where uploaded files are stored |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@linguaops.local` / `admin12345` in dev | First admin, created only when the database has no admin. **`ADMIN_PASSWORD` is required in production (min. 10 characters).** |
| `SEED_DEMO` | `true` in dev, `false` in prod | Load sample employees, jobs and applications into an empty database |
| `TRUST_PROXY` | unset | Set to `1` behind nginx, Caddy, Render, Fly or Railway |
| `COOKIE_SECURE` | `auto` | `auto` marks the session cookie Secure on HTTPS requests |
| `MAX_UPLOAD_MB` | `25` | Per-file upload limit |

---

## 4. How it works

```
admin-portal/
├── client/                 React app (Vite)
│   └── src/
│       ├── pages/          Jobs, MyJobs (employee), Applications, Team, Account, Login
│       ├── components/     Job drawer, New job / CSV import modals, notification bell, layout
│       └── context/        Auth session, toasts, live event stream
├── server/                 Node.js API (Express)
│   ├── src/
│   │   ├── routes/         auth, users, jobs, files, notifications, applications
│   │   ├── db.js           SQLite schema
│   │   ├── auth.js         password hashing, sessions, role checks
│   │   ├── events.js       Server-Sent Events hub (live notifications)
│   │   └── seed.js         first admin + demo data
│   └── test/               API tests (node --test)
├── Dockerfile, docker-compose.yml, render.yaml, fly.toml, ecosystem.config.cjs
└── deploy/                 nginx, Caddy and systemd examples
```

**Job lifecycle:** `Unassigned → Awaiting acceptance → In progress → Finished (needs review) → Completed`, with **Revision** sending finished work back to the employee. Each step is recorded in the job's activity history, and the right people are notified:

| Event | Who is notified |
|---|---|
| Job assigned / reassigned / new files added | The employee |
| Employee accepts or declines | All admins |
| **Employee finishes a job** | **All admins** (live toast + sound + desktop alert) |
| Admin approves or requests a revision | The employee |
| Job passes its deadline | Admins and the assignee |

**Security:**
- Passwords are hashed with bcrypt.
- Sessions use an httpOnly, SameSite=Lax cookie.
- Every state-changing request must carry a custom header (CSRF defence).
- Sign-in is rate-limited.
- Employees can only see, and download files for, jobs assigned to them.
- Helmet sets security headers, including a strict Content-Security-Policy.

**Limitations to know about:**
- The app is designed to run as **one instance**: SQLite and the live-event hub are in-process. That comfortably handles a team of hundreds.
- To run several instances you would swap SQLite for Postgres and add Redis pub/sub for events.
- The vendor "welcome email" and "message to applicant" are recorded but not sent. Hook up an email provider (Postmark, SES, Resend…) in `server/src/routes/applications.js` when you're ready.
