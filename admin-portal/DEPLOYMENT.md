# Deploying the Lingua Ops Admin Portal

The portal is **one Node.js process** that serves both the API and the built React app on a single port (default `4000`). It stores everything in a `data/` folder: the SQLite database and the uploaded files. Every deployment option below comes down to three things:

1. **Run the container or Node process** with the required environment variables.
2. **Keep `/data` (or `DATABASE_PATH` + `UPLOAD_DIR`) on a persistent disk.**
3. **Put HTTPS in front of it**, and set `TRUST_PROXY=1` when a proxy terminates TLS.

### Required production settings

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` (already set in the Docker image) |
| `JWT_SECRET` | 32+ random characters: `openssl rand -hex 48` |
| `ADMIN_EMAIL` | The first admin's email |
| `ADMIN_PASSWORD` | Their password (min. 10 characters). Only used when the database has no admin yet. |
| `TRUST_PROXY` | `1` when behind nginx / Caddy / Render / Fly / Railway |

The server refuses to start in production without a proper `JWT_SECRET`, or without `ADMIN_PASSWORD` when no admin exists yet. That stops you accidentally going live with development defaults.

> **Run exactly one instance.** SQLite and the live-notification hub live inside the process. Don't enable autoscaling or multiple replicas.

---

## Option A — Any Linux server with Docker (recommended)

Works on DigitalOcean, Hetzner, Linode, AWS Lightsail/EC2, Azure or GCP VMs. A 1 vCPU / 1 GB machine is plenty.

```bash
# 1. On the server: install Docker
curl -fsSL https://get.docker.com | sh

# 2. Copy the project to the server (or git clone your repository)
scp linguaops-admin-portal.zip user@your-server:~
ssh user@your-server
unzip linguaops-admin-portal.zip && cd admin-portal

# 3. Create a .env for docker compose with your secrets
cat > .env <<EOF
JWT_SECRET=$(openssl rand -hex 48)
ADMIN_EMAIL=you@yourcompany.com
ADMIN_PASSWORD=choose-a-strong-password
TRUST_PROXY=1
EOF

# 4. Build and start (restarts automatically on reboot)
docker compose up -d --build
docker compose logs -f        # should say "running on http://localhost:4000"
```

### Add HTTPS with Caddy (easiest)

Point your domain's DNS **A record** at the server, then:

```bash
sudo apt install -y caddy
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile     # edit: replace portal.example.com with your domain
sudo systemctl reload caddy
```

Caddy obtains and renews the certificate automatically. Your portal is now at `https://your-domain`.

### …or with nginx + Let's Encrypt

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/linguaops   # edit server_name
sudo ln -s /etc/nginx/sites-available/linguaops /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d portal.example.com
```

The provided nginx config turns off buffering for `/api/events`. Without that, live notifications are delayed.

### Updating

```bash
cd admin-portal && git pull        # or upload the new zip
docker compose up -d --build       # data in the portal-data volume is kept
```

---

## Option B — Render (managed, no server to look after)

1. Push the project to a GitHub or GitLab repository. `render.yaml` assumes it sits in an `admin-portal/` folder; change `rootDir` if it's at the repository root.
2. In Render: **New → Blueprint**, then pick the repository.
3. When prompted, enter `ADMIN_PASSWORD`. Edit `ADMIN_EMAIL` in `render.yaml` before you deploy. `JWT_SECRET` is generated for you.
4. Deploy. Render builds the Dockerfile, mounts a persistent disk at `/data` and gives you an HTTPS URL. You can add your own domain under *Settings → Custom Domains*.

> Persistent disks need a paid instance type (Starter or above). On the free tier your data would be wiped on every deploy.

---

## Option C — Fly.io

```bash
# install flyctl: https://fly.io/docs/flyctl/install/
cd admin-portal
fly launch --no-deploy --copy-config          # choose a unique app name; edit primary_region if you like
fly volumes create portal_data --size 5
fly secrets set JWT_SECRET=$(openssl rand -hex 48) ADMIN_EMAIL=you@yourcompany.com ADMIN_PASSWORD='choose-a-strong-password'
fly deploy
fly open
```

`fly.toml` keeps one machine running, so live notifications stay connected, and mounts the volume at `/data`.

---

## Option D — Railway

1. **New Project → Deploy from GitHub repo**. Set the service's *Root Directory* to `admin-portal`. Railway detects the Dockerfile.
2. **Variables:** set `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `TRUST_PROXY=1`.
3. **Add a Volume** to the service, mounted at `/data`.
4. Under *Settings → Networking*, generate a domain (or add your own). Make sure the service has **1 replica**.

---

## Option E — Plain Node.js (no Docker) with PM2 or systemd

On Ubuntu/Debian:

```bash
# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs build-essential

cd /opt/linguaops/admin-portal          # wherever you unzipped it
npm ci
npm run build

cat > .env <<EOF
NODE_ENV=production
PORT=4000
JWT_SECRET=$(openssl rand -hex 48)
ADMIN_EMAIL=you@yourcompany.com
ADMIN_PASSWORD=choose-a-strong-password
TRUST_PROXY=1
SEED_DEMO=false
EOF

# Either PM2…
sudo npm i -g pm2
pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
# …or systemd: see deploy/linguaops.service
```

Then add HTTPS with Caddy or nginx exactly as in Option A.

---

## Backups

Everything lives in two places: the SQLite database file and the uploads folder.

```bash
# Docker: copy the database and uploads out of the volume (safe while running)
docker compose exec portal node -e "require('better-sqlite3')('/data/portal.db').backup('/data/backup.db').then(()=>console.log('ok'))"
docker compose cp portal:/data/backup.db ./backup-$(date +%F).db
docker compose cp portal:/data/uploads ./uploads-$(date +%F)

# Plain Node: same idea with the paths from your .env
```

Schedule this daily (cron) and copy the files off the server (S3, Backblaze, another machine).

**Restore:** stop the app, put the `.db` file back at `DATABASE_PATH` and the files back in `UPLOAD_DIR`, then start it again.

---

## Go-live checklist

- [ ] `JWT_SECRET` is long and random, and kept secret
- [ ] Signed in with `ADMIN_PASSWORD`, then changed it under **Account**
- [ ] `SEED_DEMO` is `false` (no demo accounts with known passwords)
- [ ] The site is served over **HTTPS** and `TRUST_PROXY=1` is set
- [ ] `/data` is on a persistent volume, and backups are scheduled
- [ ] Only one instance or replica is running
- [ ] Employees were added under **Team**, each sharing their own temporary password; they're forced to change it on first sign-in

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Refusing to start in production: JWT_SECRET…" | Set `JWT_SECRET` to 32+ random characters |
| "No admin account exists yet…" | Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (10+ characters) for the first start |
| Signed out straight after signing in | Behind HTTPS, set `TRUST_PROXY=1`. If you forced `COOKIE_SECURE=true` but serve plain HTTP, switch it back to `auto`. |
| Notifications only appear after a refresh | Your proxy is buffering `/api/events`: use the provided nginx/Caddy config (`proxy_buffering off` / `flush_interval -1`) |
| Uploads fail with 413 | Raise `client_max_body_size` (nginx) or `MAX_UPLOAD_MB` |
| `better-sqlite3` install errors on `npm ci` | Install build tools (`build-essential`, `python3`) or use Node 22 LTS, which has prebuilt binaries |
