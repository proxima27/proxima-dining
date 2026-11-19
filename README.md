# Proxima Dining

**Discover Extraordinary Dining.** A working, database-backed development edition of Proxima’s global restaurant and digital menu guide. This is not a production deployment.

## Try the running preview

- **`/`** — browse the photographic dining guide. Search “Japanese,” open Sakura House, then explore its menu. The hero spotlight arrows and cuisine shortcuts use the database catalogue.
- **`/favorites`** — save a dish or restaurant with the heart button. Saves, eight recent entries and theme selection stay on this device.
- **`/admin`** — development-only staff login: **admin / admin123**. Create a restaurant, assign its cuisine, check **Published**, save, and search its name in the public directory. **Featured** controls the curated homepage collection. The first three featured records populate the spotlight; the fourth supplies the editor’s selection.
- **`/docs`** — the preview proxies to the backend Swagger UI. **`/api/v1/health`** checks database connectivity, not just process liveness.

The sample contains **12 fictional restaurants, eight cuisines, five categories and 60 dishes**. Images and prices are illustrative. Unknown hours, addresses, coordinates and allergen details are not invented. No customer accounts, reservations, orders, payments or user reviews exist.

## Repository

| Path | Purpose |
|---|---|
| `backend/app/core`, `database`, `models`, `schemas` | Configuration, session checks, rate limiting, relational data and validation |
| `backend/app/api` | Public catalogue, staff authentication, private CMS and sitemap |
| `backend/app/services` | Publication rules, record serialization and idempotent demo seed |
| `backend/migrations` | Two explicit Alembic revisions covering all 15 application tables |
| `frontend/src` | React Router application, public layout, shared components, local library context, public pages and editorial CMS |
| `backend/tests`, `frontend/tests` | MySQL-backed API tests and Playwright browser journeys |
| `docs/IMPLEMENTATION.md`, `docs/PROGRESS.md` | Architecture plan, relationship contract, phase report, checks and remaining gates |
| `docs/DEPLOYMENT.md`, `docs/ASSETS.md` | Release runbook and demonstration media provenance |

## Run on your own machine

Use Python 3.13, Node 20.19+ or 22.12+, npm, and MySQL 8.4. Database credentials are local configuration, not part of this source bundle.

**1. Start MySQL.** Use an existing MySQL instance or start the development-only Compose service from the repository root:

```sh
export MYSQL_PASSWORD="$(openssl rand -hex 24)"
export MYSQL_ROOT_PASSWORD="$(openssl rand -hex 32)"
docker compose up -d database
```

Wait until the database is healthy. Keep the generated passwords in a local secret store: the named volume preserves the database after a restart. With an existing server, provision database `proxima_dining` with utf8mb4 and a dedicated application user. Never use its root credentials for application traffic.

**2. Configure and migrate the API.**

```sh
cd backend
python3.13 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit DATABASE_URL. For the Compose service, the username is proxima
# and the database password is the generated value of MYSQL_PASSWORD.
alembic upgrade head
python -m app.services.seed
python -m app.core.security
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

`app.core.security` provisions or resets the single staff account and revokes existing sessions. In development it uses `ADMIN_PASSWORD` if provided, otherwise `admin123`. The demo seed refuses to run under `APP_ENV=production`. Rerunning the seed does not duplicate existing records.

**3. Start the public site and CMS.** In another shell:

```sh
cd frontend
npm ci
npm run dev -- --port 5173
```

Open `http://localhost:5173`. Browser API calls default to `/api/v1`; Vite forwards them to the local backend. No external storage or email account is required to browse, edit content using image URLs, receive contact messages or store subscriptions. Cloudinary file uploads require `CLOUDINARY_URL` on the backend. No email campaign is sent by this application.

## Verification

Use a disposable **development** database with the seed and demo administrator. API tests roll back their transactions; browser tests create then delete named test records.

```sh
cd backend && python -m pytest -q
# In frontend/, with both servers running:
npx playwright install --with-deps chromium
npm test
npm run build
```

Verified in the workspace: real MySQL 8.4, Python 3.13, migrated schema, 18 backend checks and five Chromium browser journeys. See the phase report for tested scope and release limitations.
