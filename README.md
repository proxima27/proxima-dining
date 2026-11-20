# Proxima Dining

A modern restaurant discovery and food exploration platform built with React, FastAPI, and MySQL-compatible TiDB.

Proxima Dining allows users to discover restaurants, explore cuisines, browse food categories, and view restaurant menus through a responsive web interface. It also includes an administrative dashboard for managing the platform's content.

## Live Website

**Production:** https://proxima-dining-rho.vercel.app/

**Backend API:** https://proxima-dining.onrender.com/

**Website Portfiolio-Intro :** https://pro-xima-portfiolio-ekpx.vercel.app/projects/proxima-dinning

## Project Overview

Proxima Dining is a full-stack web application designed to provide a convenient restaurant discovery experience.

The platform consists of two main interfaces:

- **Customer-facing website:** Allows visitors to explore restaurants, cuisines, food categories, and menu items.
- **Admin dashboard:** Provides administrative functionality for managing restaurant information, menus, categories, cuisines, and website settings.

## Technology Stack

### Frontend
- React
- JavaScript
- HTML5
- CSS3
- Vercel

### Backend
- Python
- FastAPI
- SQLAlchemy
- Uvicorn
- Render

### Database
- MySQL (local development)
- TiDB Cloud (production)
- SQLAlchemy database integration

### Development Tools
- Visual Studio Code
- Git and GitHub
- Python virtual environments
- npm

## System Architecture

The application uses a separated frontend and backend architecture.

```text
                 CUSTOMERS
                     |
                     v
             PROXIMA DINING
                FRONTEND
                 (React)
                     |
                     | HTTPS / API
                     v
              FASTAPI BACKEND
                  (Render)
                     |
                     | SQLAlchemy
                     v
               TiDB CLOUD
              PRODUCTION DB
```

### Deployment Architecture

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend API | Render |
| Production database | TiDB Cloud |
| Source code | GitHub |

## Main Features

### Customer Website
- Restaurant discovery
- Restaurant details
- Cuisine exploration
- Food category browsing
- Menu item listings
- Restaurant imagery
- Responsive website interface

### Administrative Dashboard
- Restaurant management
- Cuisine management
- Food category management
- Menu item management
- Restaurant image management
- Website settings management
- Administrative authentication

## Database Structure

The production database contains the following application tables:

| Table | Description | Production Records |
|---|---|---:|
| cuisines | Restaurant cuisine information | 13 |
| food_categories | Food category information | 15 |
| restaurants | Restaurant records | 24 |
| restaurant_cuisines | Restaurant-cuisine relationships | 24 |
| menu_items | Restaurant menu items | 203 |
| restaurant_images | Restaurant image records | 48 |
| site_settings | Website configuration and content | 6 |

**Total migrated application records: 333.**

Other database tables support authentication, administrative sessions, contact messages, newsletter subscriptions, dietary tags, opening hours, and additional application functionality.

## Production Database Migration

The project was initially developed using a local MySQL database.

During deployment, the existing application data was migrated into the production TiDB Cloud database.

The migration was performed using a custom Python script built with SQLAlchemy.

The migration process:

1. Connected to the local MySQL database.
2. Read existing application records.
3. Connected securely to the production TiDB database using SSL.
4. Checked that the destination content tables were empty.
5. Transferred records in dependency order.
6. Preserved original record IDs and relationships.
7. Verified production record counts after insertion.

The migration completed successfully.

The production administrative user and authentication session tables were preserved and were not overwritten.

## Local Development Setup

### Requirements
- Python 3.13 or compatible version
- Node.js and npm
- MySQL Server
- Git

### 1. Clone the repository

```bash
git clone https://github.com/proxima27/proxima-dining.git
cd proxima-dining
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the backend environment variables in `backend/.env` according to the project's configuration.

### 3. Start the backend

```bash
python -m uvicorn app.main:app --reload
```

### 4. Set up the frontend

Open another terminal:

```bash
cd frontend
npm install
```

### 5. Start the frontend

```bash
npm run dev
```

The development frontend will normally be available at:

```text
http://localhost:5173
```

## Security

- Production database connections use SSL.
- Administrative authentication is separated from public website functionality.
- Production credentials are managed through environment variables.
- Secret environment files and database credentials should never be committed to GitHub.
- Administrative database tables are excluded from the content migration.

## Deployment Status

**Current deployment status: Production deployed.**

- [x] Frontend deployed to Vercel
- [x] Backend deployed to Render
- [x] TiDB Cloud production database configured
- [x] Production admin account provisioned
- [x] Secure database connection configured
- [x] Existing local content migrated
- [x] 333 application records verified in production
- [x] Live website opens successfully
- [ ] Complete production feature testing
- [ ] Final mobile and performance testing

## Future Improvements

Potential improvements include:

- Restaurant search and advanced filtering
- Improved restaurant discovery
- More detailed restaurant information
- Enhanced mobile experience
- Performance optimization
- Additional administrative features
- Further production monitoring

## Author

**Proxima**

GitHub: https://github.com/proxima27

---

*Proxima Dining is a full-stack web development project built to demonstrate modern frontend development, backend API engineering, relational database management, and cloud deployment.*
