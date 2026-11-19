"""Third development collection, with per-dish photo corrections.

The expected previous URL is part of each update predicate: a staff member's
replacement photo always takes precedence. The operation can be rerun safely.
"""

import json
from pathlib import Path
from sqlalchemy import update
from app.core.config import PROD
from app.database.connection import Session
from app.models.catalog import Item
from app.services.expand_catalogue import expand


def add_regional_collection(db):
    if PROD:
        raise RuntimeError("Demo content is disabled in production.")
    expand(db, collection="nigeria_and_pizza.json", category_offset=9)
    photos = json.loads(Path(__file__).with_name("individual_photos.json").read_text())
    for slug, entry in photos.items():
        db.execute(
            update(Item)
            .where(Item.slug == slug, Item.image_url == entry["old"])
            .values(image_url=entry["new"])
        )


if __name__ == "__main__":
    with Session.begin() as db:
        add_regional_collection(db)
