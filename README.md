# Lingua Ops — Admin Portal

The full application lives in **[`admin-portal/`](admin-portal/)**: a React + Node.js web app with sign-in, job uploads and assignment, live "job finished" notifications, an employee workspace, team management and vendor application review.

- **Run locally / deploy:** see [`admin-portal/README.md`](admin-portal/README.md) and [`admin-portal/DEPLOYMENT.md`](admin-portal/DEPLOYMENT.md)
- **Download as a zip:** [`linguaops-admin-portal.zip`](linguaops-admin-portal.zip) (same contents, without `node_modules`)

```bash
cd admin-portal && npm install && npm run setup && npm run dev   # → http://localhost:5173
```

The HTML files in this folder (`vendor-review.html`, `jobs.html`, `employee.html`) are the earlier static design prototypes the React app was built from.
