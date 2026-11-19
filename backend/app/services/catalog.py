from fastapi import HTTPException
from sqlalchemy import or_

from app.models.catalog import Cuisine, Item, Restaurant


def row(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


def card(x):
    d = row(x)
    if isinstance(x, Restaurant):
        d.update(
            cuisines=[c.name for c in x.cuisines],
            cuisine_ids=[c.id for c in x.cuisines],
        )
    if isinstance(x, Item):
        d.update(
            restaurant=x.restaurant.name,
            restaurant_slug=x.restaurant.slug,
            category=x.category.name,
            tags=[t.name for t in x.tags],
        )
    return d


def public(db, model):
    q = db.query(model)
    if model == Restaurant:
        q = q.filter(Restaurant.is_published.is_(True))
    if model == Item:
        q = q.join(Restaurant).filter(
            Item.is_published.is_(True), Restaurant.is_published.is_(True)
        )
    return q


def one(q):
    obj = q.first()
    if obj is None:
        raise HTTPException(404, "This entry is not available.")
    return obj


def matched(term):
    p = "%" + term + "%"
    return or_(
        Restaurant.name.ilike(p),
        Restaurant.city.ilike(p),
        Restaurant.country.ilike(p),
        Restaurant.cuisines.any(Cuisine.name.ilike(p)),
    )
