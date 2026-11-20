import secrets
from datetime import timedelta

from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app.core.config import PROD
from app.core.limits import limit
from app.core.security import authorized, cookie, digest, hasher, minutes, now
from app.database.connection import db_session
from app.models.catalog import Admin, AdminSession

api = APIRouter(prefix="/api/v1/admin/auth")
dummy = hasher.hash(secrets.token_urlsafe(24))


class Login(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)


@api.post("/login")
def login(data: Login, req: Request, response: Response, db=Depends(db_session)):
    limit(req, "login", 10)
    if req.headers.get("x-csrf-token") != "login":
        raise HTTPException(403, "Use the staff sign-in form.")
    a = db.query(Admin).filter_by(username=data.username, is_active=True).first()
    try:
        hasher.verify(a.password_hash if a else dummy, data.password)
    except VerifyMismatchError:
        raise HTTPException(401, "Invalid username or password.")
    if not a or (PROD and data.password == "admin123"):
        raise HTTPException(401, "Sign-in unavailable.")
    token = secrets.token_urlsafe(32)
    csrf = secrets.token_hex(32)
    db.query(AdminSession).filter(AdminSession.expires_at <= now()).delete()
    db.add(
        AdminSession(
            admin_user_id=a.id,
            session_token_hash=digest(token),
            csrf=csrf,
            expires_at=now() + timedelta(minutes=minutes),
        )
    )
    db.commit()
    response.set_cookie(
        cookie,
        token,
        max_age=minutes * 60,
        httponly=True,
        secure=PROD,
        samesite="none" if PROD else "lax",
        path="/api/v1/admin",
    )
    response.headers["Cache-Control"] = "no-store"
    return {"username": a.username, "csrf": csrf}


@api.get("/me")
def me(response: Response, s=Depends(authorized), db=Depends(db_session)):
    response.headers["Cache-Control"] = "no-store"
    return {"username": db.get(Admin, s.admin_user_id).username, "csrf": s.csrf}


@api.post("/logout")
def logout(response: Response, s=Depends(authorized), db=Depends(db_session)):
    db.delete(s)
    db.commit()
    response.delete_cookie(cookie, path="/api/v1/admin")
    return {"message": "Signed out."}
