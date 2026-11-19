# Proxima Dining · implementation plan

**Scope.** An editorial discovery publication with a public catalogue and separate staff CMS. Only staff authenticate. No visitor identities, orders, payments, bookings, reviews or restaurant-owner tooling.

| Phase | Deliverable | Gate before advancing |
|---|---|---|
| 1 Foundation | Local MySQL, environment configuration, SQLAlchemy connection, versioned Alembic schema, FastAPI readiness endpoint; React/Vite shell and API proxy | Migrate a clean database, probe readiness, build the client |
| 2 Catalogue | Normalized records, repeatable fictional seed, publication-aware reads, filtered and paginated restaurant queries, categorized search | Check detail/list consistency, unpublished-record exclusion and filtering |
| 3 Public experience | Editorial homepage, directory, cuisines, dishes, local saves, theme and recent history; contact and subscription forms | Follow a restaurant → menu → dish journey, verify writes and browser persistence |
| 4 Staff sessions | Argon2id hashes, expiring opaque cookies, hashed tokens, origin/CSRF protection, throttled login | Reject unauthorized/expired sessions, test logout |
| 5 CMS | Authenticated record management, Cloudinary uploads, messages, subscribers, website settings | Confirm each mutation in database and public reads; validate actual storage upload |
| 6 Assurance | API integration tests, responsive browser tests, accessibility, SEO and security review | Pass the acceptance matrix, document gaps |
| 7 Release | Vercel + Render + Aiven, same-site HTTPS routing, backups, TLS, secrets and storage | Confirm provider pricing, budget, domain, deployment permissions, restore test and production smoke tests |

## Components and dependencies
Frontend: React, React Router, Vite, Tailwind, Axios and Lucide. Context owns local-only preferences. API responses are the content source. Backend: Python 3.13, FastAPI/Uvicorn, Pydantic, SQLAlchemy, PyMySQL, Alembic. Security: argon2-cffi, cryptographic randomness. Testing: pytest/httpx and browser smoke tests. MySQL 8 uses utf8mb4 and InnoDB. API prefix /api/v1; /docs in development only.

## Relationship contract
restaurants ↔ cuisines via restaurant_cuisines (composite key); restaurants → menu_items, restaurant_images and opening_hours. food_categories → menu_items. menu_items → menu_item_images; menu_items ↔ dietary_tags via menu_item_tags. admin_users → admin_sessions. contact_messages, newsletter_subscribers and site_settings stand alone. Child images/hours cascade on parent deletion; referenced cuisines/categories must not be silently removed. Public slugs, subscriber emails, setting keys and token hashes unique. Money stored as DECIMAL plus currency code; unknown hours, coordinates and allergens stay absent.

## Configuration and security
Separate frontend public API base from backend-only DATABASE_URL, allowed origin and storage credentials. No secrets in source control. Development credentials never provisioned in production. Database operations parameterized; no browser-side authorization. Use one same-origin API proxy or same-site custom domains in production; cookies HttpOnly, Secure on HTTPS, SameSite, short expiry. Restrict CORS, verify mutating requests, validate text lengths and image contents; never return secret fields. Public catalogue must exclude unpublished parents and children.
