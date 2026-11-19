from alembic import context
from app.database.connection import engine, Base
from app.models.settings import Setting
from app.models import catalog

with engine.connect() as con:
    context.configure(connection=con, target_metadata=Base.metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()
