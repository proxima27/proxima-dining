# Portable image bundle

This edition has 222 photographic files and one standalone SVG monogram. No download-from-provider or image-generation step is needed when starting from the ZIP.

| Content | Source | Compiled output / browser URL |
|---|---|---|
| Restaurant, dish, cuisine, category, gallery, fallback and hero photographs | `frontend/public/images/` | `frontend/dist/images/`, requested at `/images/<filename>.jpg` |
| Favicon | `frontend/public/monogram.svg` | `frontend/dist/monogram.svg`, requested at `/monogram.svg` |
| Brand mark and interface icons | Inline SVG in React, including Lucide SVG components | Included in the local JavaScript bundle; no icon service |
| Typefaces | Fontsource packages locked in `frontend/package-lock.json` | Local font files in `frontend/dist/assets/` |
| Attribution | `frontend/public/photo-credits.html` and local source notes | Photo thumbnails load locally. External author/licence links are citations, not media dependencies. |

`frontend/public/images/` is intentionally kept at its existing location. Vite copies public files without changing their names. Restaurant records, menus, saved favorites, CSS backgrounds and credit pages can keep their `/images/…` references. No preview hostname belongs in an image URL.

## Use the downloadable build

The release ZIP includes both the sources and the already-built `frontend/dist/`. Serve the **contents** of `dist/` at the origin root, with `/api/v1/` proxied to your FastAPI backend and SPA fallbacks for client routes. Serve existing static files directly. Do not open `index.html` via `file://`. The catalogue still requires the configured database, migrations and API described in the README; this is not an offline database dump. Local photos do not require Cloudinary or any external image host.

## Verify independently

1. In `frontend/`, run `npm ci` with Node 20.19+ and then `npm run build`. The `postbuild` check compares the source **and** output image trees with `image-manifest.json`. Each entry records the exact URL, byte length and SHA-256 hash. Extra, missing or modified images fail the check.
2. Install the browser once with `npx playwright install --with-deps chromium`, then run `npm run verify:images`. The script serves the compiled `dist/` on an ephemeral loopback port and closes it after the test. It blocks cross-origin requests and service workers, checks HTTP response types, and uses `Image.decode()` to verify every file, including the favicon. It also checks the source paths on the credits page. No backend is required for this step.
3. With the development database configured, run `python -m app.services.audit_images` from `backend/`. This read-only check includes restaurant covers and optional logos, dish covers, cuisines, categories, both gallery tables and the configured site logo, whether or not records are published. It checks URLs against the release manifest rather than silently substituting a fallback.
4. With the API running on `127.0.0.1:8000` and the standard demo content seeded, run `npm run verify:images -- --with-api` from `frontend/` to check ten representative public and staff routes, including hero backgrounds and gallery images. Use the default relative browser API base for this test.

For this release the inventory contains **223 files**, **304 database image references** point to **222 distinct photographs**, and **144 credits-page thumbnail references** resolve locally.

## When images change

The staff CMS still supports hosted uploads for live deployments. A later hosted upload is **not** automatically part of this ZIP. Before exporting another portable edition, place the approved original under `frontend/public/images/`, update the record and repeatable seed to its local `/images/…` path, and add the attribution. After reviewing the changes, run `node scripts/image-inventory.mjs --write` in `frontend/`, then repeat all checks. Hidden or remote references should not be accepted as a passing portable release.
