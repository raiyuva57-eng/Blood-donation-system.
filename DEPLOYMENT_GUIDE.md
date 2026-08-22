# Deployment Guide — Smart Blood Donation Management System

This guide covers deploying:
1. MySQL database (Railway or PlanetScale)
2. Backend API (Render)
3. Frontend (Vercel)

---

## 1. Deploy MySQL Database

### Option A: Railway (recommended — simplest)

1. Go to https://railway.app and sign in with GitHub
2. Click **New Project → Provision MySQL**
3. Once provisioned, open the MySQL service → **Connect** tab — copy these values:
   - `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`
4. Open Railway's **Data** tab → **Query** editor, paste the entire contents of `database/schema.sql`, and run it
5. Verify: run `SHOW TABLES;` — you should see all 11 tables

### Option B: PlanetScale

1. Go to https://planetscale.com → **Create a database**
2. Once created, go to **Connect** → select **Node.js** → copy the connection details
3. PlanetScale doesn't support foreign key constraints by default on some plans — if `schema.sql` fails on `FOREIGN KEY`, use PlanetScale's **branch → deploy request** workflow instead, or fall back to Railway which supports FKs natively (this system relies heavily on them)
4. Run `schema.sql` via the PlanetScale CLI: `pscale shell <database> main < database/schema.sql`

### Option C: Local MySQL (for development/demo only — not reachable by Render)

Only use this if you're demoing everything on one machine. For a real deployed system, use Railway or PlanetScale so Render's backend can reach the database over the internet.

---

## 2. Deploy Backend to Render

1. Push your `server/` code to a GitHub repository (can be the same repo as `client/`, in a subfolder)
2. Go to https://render.com → **New → Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free (or paid for no cold-starts)
5. Add environment variables (Render dashboard → **Environment**):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` (Render auto-assigns via its own `PORT` env — server.js already reads `process.env.PORT`) |
| `DB_HOST` | from Railway/PlanetScale |
| `DB_USER` | from Railway/PlanetScale |
| `DB_PASSWORD` | from Railway/PlanetScale |
| `DB_NAME` | from Railway/PlanetScale |
| `DB_PORT` | `3306` |
| `JWT_SECRET` | generate a long random string (see below) |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | your Vercel URL, e.g. `https://blood-donation.vercel.app` (set this **after** step 3 below) |
| `MAIL_HOST` | `smtp.gmail.com` |
| `MAIL_PORT` | `587` |
| `MAIL_USER` | your email |
| `MAIL_PASSWORD` | Gmail App Password (not your regular password — generate one at https://myaccount.google.com/apppasswords) |
| `MAIL_FROM` | `Blood Donation System <youremail@gmail.com>` |
| `MAX_FILE_SIZE` | `5242880` |

To generate a strong `JWT_SECRET` locally:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"