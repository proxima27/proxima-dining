from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    Time,
    func,
)
from sqlalchemy import Column as C
from sqlalchemy.orm import relationship

from app.database.connection import Base


def fk(table, delete="CASCADE"):
    return C(
        Integer, ForeignKey(table + ".id", ondelete=delete), nullable=False, index=True
    )


class Record:
    id = C(Integer, primary_key=True)
    created_at = C(DateTime, server_default=func.now(), nullable=False)


class Entry(Record):
    name = C(String(160), nullable=False)
    slug = C(String(180), unique=True, nullable=False)
    description = C(Text, nullable=False, default="")
    image_url = C(String(1024), nullable=False, default="")
    updated_at = C(DateTime, server_default=func.now(), onupdate=func.now())


rc = Table(
    "restaurant_cuisines",
    Base.metadata,
    C(
        "restaurant_id",
        Integer,
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    C(
        "cuisine_id",
        Integer,
        ForeignKey("cuisines.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
)
mt = Table(
    "menu_item_tags",
    Base.metadata,
    C(
        "menu_item_id",
        Integer,
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    C(
        "dietary_tag_id",
        Integer,
        ForeignKey("dietary_tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Restaurant(Entry, Base):
    __tablename__ = "restaurants"
    city = C(String(100), index=True, nullable=False)
    country = C(String(100), index=True, nullable=False)
    country_code = C(String(2))
    address = C(String(255))
    phone = C(String(50))
    website_url = C(String(1024))
    contact_email = C(String(254))
    logo_url = C(String(1024))
    instagram_url = C(String(1024))
    facebook_url = C(String(1024))
    latitude = C(Numeric(9, 6))
    longitude = C(Numeric(9, 6))
    timezone = C(String(80))
    price_category = C(String(4), nullable=False, default="$$")
    is_featured = C(Boolean, index=True, default=False)
    is_published = C(Boolean, index=True, default=False)
    cuisines = relationship("Cuisine", secondary=rc, lazy="selectin")
    gallery = relationship(
        "RestaurantImage",
        order_by="RestaurantImage.display_order",
        passive_deletes=True,
    )
    hours = relationship("Hours", order_by="Hours.day_of_week", passive_deletes=True)


class Cuisine(Entry, Base):
    __tablename__ = "cuisines"


class Category(Entry, Base):
    __tablename__ = "food_categories"
    display_order = C(Integer, default=0)


class Item(Entry, Base):
    __tablename__ = "menu_items"
    restaurant_id = fk("restaurants")
    category_id = fk("food_categories", "RESTRICT")
    restaurant = relationship(Restaurant)
    category = relationship(Category)
    price = C(Numeric(12, 2))
    currency = C(String(3))
    ingredients = C(Text)
    allergen_information = C(Text)
    tags = relationship("Tag", secondary=mt)
    is_featured = C(Boolean, default=False)
    is_published = C(Boolean, default=False)
    gallery = relationship(
        "ItemImage", order_by="ItemImage.display_order", passive_deletes=True
    )


class ImageRecord(Record):
    image_url = C(String(1024), nullable=False)
    caption = C(String(255))
    display_order = C(Integer, default=0)


class RestaurantImage(ImageRecord, Base):
    __tablename__ = "restaurant_images"
    restaurant_id = fk("restaurants")


class ItemImage(ImageRecord, Base):
    __tablename__ = "menu_item_images"
    menu_item_id = fk("menu_items")


class Tag(Record, Base):
    __tablename__ = "dietary_tags"
    name = C(String(80), nullable=False)
    slug = C(String(80), unique=True)
    description = C(Text)


class Hours(Record, Base):
    __tablename__ = "opening_hours"
    restaurant_id = fk("restaurants")
    day_of_week = C(Integer, nullable=False)
    opens_at = C(Time)
    closes_at = C(Time)
    is_closed = C(Boolean, default=False)


class Message(Record, Base):
    __tablename__ = "contact_messages"
    name = C(String(120), nullable=False)
    email = C(String(254), nullable=False)
    subject = C(String(160), nullable=False)
    message = C(Text, nullable=False)
    is_read = C(Boolean, default=False)


class Subscriber(Record, Base):
    __tablename__ = "newsletter_subscribers"
    email = C(String(254), nullable=False, unique=True)
    is_active = C(Boolean, default=True)
    unsubscribed_at = C(DateTime)


class Admin(Record, Base):
    __tablename__ = "admin_users"
    username = C(String(80), nullable=False, unique=True)
    password_hash = C(String(255), nullable=False)
    is_active = C(Boolean, default=True)


class AdminSession(Record, Base):
    __tablename__ = "admin_sessions"
    admin_user_id = fk("admin_users")
    session_token_hash = C(String(64), unique=True, nullable=False)
    csrf = C(String(64), nullable=False)
    expires_at = C(DateTime, nullable=False)
