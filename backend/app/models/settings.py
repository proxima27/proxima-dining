from sqlalchemy import Column, Integer, String, Text

from app.database.connection import Base


class Setting(Base):
    __tablename__ = "site_settings"
    id = Column(Integer, primary_key=True)
    setting_key = Column(String(80), nullable=False, unique=True)
    setting_value = Column(Text, nullable=False)
