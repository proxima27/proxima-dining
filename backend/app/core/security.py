import hashlib
import os
import secrets
from datetime import datetime, timezone

from argon2 import PasswordHasher
from fastapi import Depends, HTTPException, Request

from app.core.config import PROD
from app.database.connection import Session, db_session
from app.models.catalog import Admin, AdminSession

hasher = PasswordHasher()
cookie = os.getenv("SESSION_COOKIE_NAME", "proxima_admin_session")
minutes = max(1, min(1440, int(os.getenv("SESSION_EXPIRE_MINUTES", "60"))))
now = lambda: datetime.now(timezone.utc).replace(tzinfo=None)


def digest(t):
    return hashlib.sha256(t.encode()).hexdigest()


def authorized(req: Request, db=Depends(db_session)):
    token = req.cookies.get(cookie, "")
    s = (
        db.query(AdminSession)
        .join(Admin)
        .filter(
            AdminSession.session_token_hash == digest(token),
            AdminSession.expires_at > now(),
            Admin.is_active.is_(True),
        )
        .first()
    )
    if not s:
        raise HTTPException(401, "Staff session required.")
    if req.method not in ("GET", "HEAD") and not secrets.compare_digest(
        req.headers.get("x-csrf-token", ""), s.csrf
    ):
        raise HTTPException(403, "Invalid request token.")
    return s


def provision():
    password = os.getenv("ADMIN_PASSWORD") or ("" if PROD else "admin123")
    if PROD and (len(password) < 16 or password == "admin123"):
        raise SystemExit("Set a strong ADMIN_PASSWORD first")
    with Session.begin() as db:
        a = db.query(Admin).filter_by(username="admin").first()
        if not a:
            a = Admin(username="admin")
            db.add(a)
        a.password_hash = hasher.hash(password)
        db.query(AdminSession).delete()


if __name__ == "__main__":
    provision()
