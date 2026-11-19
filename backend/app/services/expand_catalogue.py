"""Add the second demo collection without replacing earlier editorial records."""

import json
import re
import unicodedata
from decimal import Decimal
from pathlib import Path

from app.core.config import PROD
from app.database.connection import Session
from app.models.catalog import Category, Cuisine, Item, Restaurant, RestaurantImage


def slug(value):
    ascii_name = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")


def image(key):
    return f"/images/{key}.jpg"


def expand(db, collection="catalogue_expansion.json", category_offset=5):
    if PROD:
        raise RuntimeError("The fictional catalogue is for development only.")
    data = json.loads(Path(__file__).with_name(collection).read_text())

    def find(model, key):
        return db.query(model).filter_by(slug=key).first()

    for position, (name, (description, cover)) in enumerate(
        data["categories"].items(), category_offset
    ):
        if not find(Category, slug(name)):
            db.add(
                Category(
                    name=name,
                    slug=slug(name),
                    description=description,
                    image_url=image(cover),
                    display_order=position,
                )
            )

    def add_items(restaurant, items, currency, feature_first):
        for i, dish in enumerate(items):
            key = restaurant.slug + "-" + slug(dish["name"])
            if find(Item, key):
                continue
            category = find(Category, slug(dish["category"]))
            if not category:
                raise ValueError("Missing seed category: " + dish["category"])
            db.add(
                Item(
                    name=dish["name"],
                    slug=key,
                    restaurant_id=restaurant.id,
                    category_id=category.id,
                    description=dish["description"],
                    image_url=image(dish["image"]),
                    price=Decimal(dish["price"]),
                    currency=currency,
                    is_published=True,
                    is_featured=feature_first and i == 0,
                )
            )

    for v in data["venues"]:
        cuisine = find(Cuisine, slug(v["cuisine"]))
        if not cuisine:
            cuisine = Cuisine(
                name=v["cuisine"],
                slug=slug(v["cuisine"]),
                description=data["cuisines"][v["cuisine"]],
                image_url=image(v["items"][0]["image"]),
            )
            db.add(cuisine)
        r = find(Restaurant, slug(v["name"]))
        if not r:
            r = Restaurant(
                **{
                    k: v[k]
                    for k in (
                        "name",
                        "city",
                        "country",
                        "country_code",
                        "price_category",
                        "description",
                    )
                },
                slug=slug(v["name"]),
                cuisines=[cuisine],
                image_url=image(v["cover"]),
                is_featured=False,
                is_published=True,
            )
            db.add(r)
            db.flush()
            db.add_all(
                [
                    RestaurantImage(
                        restaurant_id=r.id,
                        image_url=image(v["cover"]),
                        caption="The dining room",
                        display_order=0,
                    ),
                    RestaurantImage(
                        restaurant_id=r.id,
                        image_url=image(v["items"][0]["image"]),
                        caption=v["items"][0]["name"],
                        display_order=1,
                    ),
                ]
            )
        add_items(r, v["items"], v["currency"], True)

    for key, dishes in data["extras"].items():
        r = find(Restaurant, key)
        if r:
            # Keep the currency of the existing menu rather than inferring from the visitor.
            original = (
                db.query(Item)
                .filter_by(restaurant_id=r.id)
                .filter(Item.currency.isnot(None))
                .order_by(Item.id)
                .first()
            )
            if original:
                add_items(r, dishes, original.currency, False)


if __name__ == "__main__":
    with Session.begin() as db:
        expand(db)
