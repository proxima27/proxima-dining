from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.api.admin import api as admin_api
from app.api.auth import api as auth_api
from app.api.public import api as public_api
from app.api.seo import api as seo_api
from app.core.config import ORIGIN, PROD
from app.database.connection import db_session

app = FastAPI(
    title="Proxima Dining", docs_url=None if PROD else "/docs", redoc_url=None
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "PUT"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)


@app.exception_handler(IntegrityError)
async def conflict(req, exc):
    return JSONResponse({"detail": "Duplicate value or referenced record."}, 409)


@app.exception_handler(SQLAlchemyError)
async def database_error(req, exc):
    return JSONResponse({"detail": "Database temporarily unavailable."}, 503)


@app.get("/api/v1/health")
def health(db=Depends(db_session)):
    db.execute(text("SELECT 1"))
    return {"status": "ready", "database": "connected"}


app.include_router(public_api)

app.include_router(auth_api)

app.include_router(admin_api)

app.include_router(seo_api)


@app.exception_handler(RequestValidationError)
async def invalid_input(request, exception):
    return JSONResponse(
        {"detail": [{"loc": e["loc"], "msg": e["msg"]} for e in exception.errors()]},
        422,
    )


@app.middleware("http")
async def response_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith("/api/v1/admin"):
        response.headers["Cache-Control"] = "no-store"
    return response
