from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import or_

from app.core.limits import limit
from app.database.connection import db_session
from app.models.catalog import Category, Cuisine, Item, Message, Restaurant, Subscriber
from app.models.settings import Setting
from app.schemas.public import (
    Destination,
    DishDetail,
    DishPage,
    DishRead,
    EntryRead,
    RestaurantDetail,
    RestaurantPage,
    Results,
    Spotlight,
)
from app.services.catalog import card, matched, one, public, row

api = APIRouter(prefix="/api/v1")
D = Depends(db_session)


@api.get("/restaurants", response_model=RestaurantPage)
def restaurants(
    search: str = "",
    country: str = "",
    city: str = "",
    cuisine: str = "",
    price_category: str = "",
    featured: bool | None = None,
    sort: Literal["featured", "newest", "alpha"] = "featured",
    page: int = Query(1, ge=1),
    size: int = Query(9, ge=1, le=40),
    db=D,
):
    q = public(db, Restaurant)
    if search:
        q = q.filter(matched(search))
    for col, val in [
        (Restaurant.city, city),
        (Restaurant.country, country),
        (Restaurant.price_category, price_category),
    ]:
        if val:
            q = q.filter(col == val)
    if cuisine:
        q = q.filter(
            Restaurant.cuisines.any(
                or_(Cuisine.slug == cuisine, Cuisine.name == cuisine)
            )
        )
    if featured is not None:
        q = q.filter(Restaurant.is_featured == featured)
    order = {
        "alpha": Restaurant.name,
        "newest": Restaurant.id.desc(),
        "featured": Restaurant.is_featured.desc(),
    }[sort]
    return {
        "items": [
            card(x)
            for x in q.order_by(order, Restaurant.id)
            .offset((page - 1) * size)
            .limit(size)
        ],
        "total": q.count(),
        "page": page,
        "size": size,
    }


@api.get("/restaurants/featured", response_model=list[Spotlight])
def featured(db=D):
    return [
        dict(
            card(x),
            spotlight_image=x.gallery[0].image_url if x.gallery else x.image_url,
        )
        for x in public(db, Restaurant)
        .filter_by(is_featured=True)
        .order_by(Restaurant.id)
        .limit(12)
    ]


@api.get("/restaurants/destinations", response_model=list[Destination])
def destinations(db=D):
    return [
        dict(city=a, country=b)
        for a, b in public(db, Restaurant)
        .with_entities(Restaurant.city, Restaurant.country)
        .distinct()
        .order_by(Restaurant.city)
    ]


@api.get("/restaurants/{slug}", response_model=RestaurantDetail)
def restaurant(slug: str, db=D):
    r = one(public(db, Restaurant).filter_by(slug=slug))
    d = card(r)
    ids = [c.id for c in r.cuisines]
    return dict(
        d,
        gallery=[row(x) for x in r.gallery],
        hours=[row(x) for x in r.hours],
        similar=[
            card(x)
            for x in public(db, Restaurant)
            .filter(
                Restaurant.id != r.id,
                or_(
                    Restaurant.cuisines.any(Cuisine.id.in_(ids)),
                    Restaurant.country == r.country,
                ),
            )
            .limit(3)
        ],
    )


@api.get("/restaurants/{slug}/menu", response_model=list[DishRead])
def menu(slug: str, db=D):
    return [
        card(x)
        for x in public(db, Item).filter(Restaurant.slug == slug).order_by(Item.id)
    ]


@api.get("/cuisines", response_model=list[EntryRead])
def cuisines(db=D):
    return [row(x) for x in db.query(Cuisine).order_by(Cuisine.name)]


@api.get("/cuisines/{slug}", response_model=EntryRead)
def cuisine_detail(slug: str, db=D):
    return row(one(db.query(Cuisine).filter_by(slug=slug)))


@api.get("/categories", response_model=list[EntryRead])
def categories(db=D):
    return [row(x) for x in db.query(Category).order_by(Category.display_order)]


@api.get("/categories/{slug}", response_model=EntryRead)
def category_detail(slug: str, db=D):
    return row(one(db.query(Category).filter_by(slug=slug)))


@api.get("/menu-items", response_model=DishPage)
def menu_items(
    category: str = "",
    featured: bool | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=40),
    db=D,
):
    q = public(db, Item)
    if category:
        q = q.filter(Item.category.has(Category.slug == category))
    if featured is not None:
        q = q.filter(Item.is_featured == featured)
    return {
        "items": [
            card(x) for x in q.order_by(Item.id).offset((page - 1) * size).limit(size)
        ],
        "total": q.count(),
    }


@api.get("/menu-items/{slug}", response_model=DishDetail)
def dish(slug: str, db=D):
    x = one(public(db, Item).filter(Item.slug == slug))
    return dict(
        card(x),
        gallery=[row(i) for i in x.gallery],
        similar=[
            card(i)
            for i in public(db, Item)
            .filter(Item.id != x.id, Item.category_id == x.category_id)
            .limit(3)
        ],
    )


@api.get("/search", response_model=Results)
def search(q: str = Query(..., min_length=1, max_length=160), db=D):
    p = "%" + q + "%"
    return {
        "restaurants": [
            card(x) for x in public(db, Restaurant).filter(matched(q)).limit(30)
        ],
        "cuisines": [
            row(x) for x in db.query(Cuisine).filter(Cuisine.name.ilike(p)).limit(20)
        ],
        "dishes": [
            card(x)
            for x in public(db, Item)
            .filter(or_(matched(q), Item.name.ilike(p)))
            .limit(30)
        ],
        "destinations": [
            dict(city=c, country=k)
            for c, k in public(db, Restaurant)
            .with_entities(Restaurant.city, Restaurant.country)
            .filter(or_(Restaurant.city.ilike(p), Restaurant.country.ilike(p)))
            .distinct()
            .limit(20)
        ],
    }


class Email(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    email: EmailStr


class Contact(Email):
    name: str = Field(min_length=1, max_length=120)
    subject: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=5000)
    company: str = Field(default="", max_length=0)


@api.post("/contact", status_code=201)
def contact(data: Contact, request: Request, db=D):
    limit(request, "contact", 8)
    db.add(Message(**data.model_dump(exclude={"company"})))
    db.commit()
    return {"message": "Thank you. Your message has been received."}


@api.post("/newsletter/subscribe")
def subscribe(data: Email, request: Request, db=D):
    limit(request, "subscribe", 12)
    email = str(data.email).lower()
    r = db.query(Subscriber).filter_by(email=email).first()
    if not r:
        db.add(Subscriber(email=email))
    else:
        r.is_active = True
        r.unsubscribed_at = None
    db.commit()
    return {"message": "You’re on the list. Thank you for subscribing."}


@api.post("/newsletter/unsubscribe")
def unsubscribe(data: Email, request: Request, db=D):
    limit(request, "unsubscribe", 12)
    r = db.query(Subscriber).filter_by(email=str(data.email).lower()).first()
    if r:
        r.is_active = False
        r.unsubscribed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
    return {"message": "Your unsubscribe request has been processed."}


@api.get("/settings")
def settings(db=D):
    return {
        x.setting_key: x.setting_value
        for x in db.query(Setting).filter(
            Setting.setting_key.in_(
                [
                    "footer_text",
                    "website_title",
                    "website_description",
                    "contact_email",
                    "logo_url",
                    "instagram_url",
                    "facebook_url",
                ]
            )
        )
    }
