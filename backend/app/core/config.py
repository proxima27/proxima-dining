import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
PROD = os.getenv("APP_ENV", "development") == "production"
DATABASE_URL = os.environ["DATABASE_URL"]
ORIGIN = os.getenv("FRONTEND_URL", "http://localhost:5173")
if PROD and (not ORIGIN.startswith("https://") or not os.getenv("MYSQL_SSL_CA")):
    raise RuntimeError(
        "Production requires HTTPS frontend origin and database CA certificate"
    )
