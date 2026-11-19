import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"ssl_ca": os.environ["MYSQL_SSL_CA"], "ssl_verify_identity": True}
    if os.getenv("MYSQL_SSL_CA")
    else {},
)
Session = sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def db_session():
    with Session() as s:
        yield s
