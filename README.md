# Smart Blood Donation Management System — Fixed

This is the repaired version of `blood-donation-system--main`. The original zip had every
file dumped flat in one folder with no `backend/` or `frontend/` split, so none of the
`require()`/`import` paths resolved. On top of that, **18 React dashboard pages** that
`App.jsx` routes to didn't exist in the zip at all, `app.js` had every API route
commented out, and there was no `patientController.js`, no hospital feature (controller/
routes/service), no `package.json` for the frontend, and no real Vite `index.html`
(the zip's `index.html`/`index1.html`/`In.html`/`Plus.html`/`pulse-blood-donation-ui.html`
were five duplicate static design mockups, not app scaffolding).

## What was fixed

**Backend** (`/backend`)
- Reorganized all files into `config/ controllers/ routes/ models/ middleware/ services/ utils/`
- Wrote the missing `controllers/patientController.js`
- Added a full hospital management feature: `hospitalController.js`, `hospitalRoutes.js`,
  mounted at `/api/hospitals`
- Uncommented and correctly mounted every route in `app.js`
- Added `.env.example`

**Frontend** (`/frontend`)
- Reorganized all files into `src/{components,context,layouts,pages,services,hooks,utils}`
  with correct casing to match every import in `App.jsx`
- Wrote the **18 missing dashboard pages** (Admin ×8, Donor ×4, Patient ×3, Hospital ×3),
  wired to the real backend endpoints — tables, search, status updates, request creation,
  stock management, Excel import/export, printable donor certificates
- Added `package.json` (none existed), a real Vite `index.html`, and `theme.css`
  (referenced by `main.jsx` but missing) using the crimson/teal palette from the static site
- Added `hospitalService.js` to call the new hospital endpoints

Every relative import (frontend) and `require()` path (backend) was verified to resolve to
an actual file. All backend files pass `node --check`.

## Running it

**Backend**
```
cd backend
cp .env.example .env      # fill in your MySQL credentials + JWT secret
npm install
# create the database and run schema.sql against it
npm run dev                # http://localhost:5000
```

**Frontend**
```
cd frontend
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

## Known gaps to be aware of

- `donation_history` (certificates/completed donations) has a table in `schema.sql` but
  no dedicated API route — the donor certificate/history pages currently derive from
  `blood_requests` with status `accepted`/`fulfilled`. Add a `donationController`/
  `donationRoutes` if you want certificates tied to the real `donation_history` table.
- No automated tests were included in the original project.
- The five duplicate static HTML mockups from the original zip were left out of this
  build since they were design references, not app code — see `lifedrop-static.zip`
  if you'd rather ship that plain HTML/CSS/JS site instead of this React+Node system.
