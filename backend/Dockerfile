FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --system --uid 10001 publisher
COPY app app
COPY migrations migrations
COPY alembic.ini .
USER publisher
ENV APP_ENV=production
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --no-proxy-headers"]
