"""Fail release verification if the database references media outside the bundle.

Run from backend/ with `python -m app.services.audit_images`. Read-only, no
network downloads. Covers drafts and published content, not just the homepage.
"""
import json
from pathlib import Path
from sqlalchemy import select
from app.database.connection import Session
from app.models.catalog import Category, Cuisine, Item, ItemImage, Restaurant, RestaurantImage
from app.models.settings import Setting


def audit():
    manifest_path = Path(__file__).resolve().parents[3] / 'frontend/image-manifest.json'
    paths = {entry['url'] for entry in json.loads(manifest_path.read_text())['images']}
    invalid, seen = [], set()
    count = 0
    with Session() as db:
        columns = [(Restaurant, Restaurant.image_url), (Restaurant, Restaurant.logo_url),
                   (Item, Item.image_url), (Category, Category.image_url),
                   (Cuisine, Cuisine.image_url), (RestaurantImage, RestaurantImage.image_url),
                   (ItemImage, ItemImage.image_url), (Setting, Setting.setting_value)]
        for model, column in columns:
            query = select(model.id, column)
            if model is Setting:
                query = query.where(Setting.setting_key == 'logo_url')
            for record_id, url in db.execute(query):
                if not url:
                    continue
                count += 1
                if url not in paths:
                    # Do not echo signed URLs or other credentials from an invalid reference.
                    invalid.append(f'{model.__tablename__} #{record_id}: {column.key}')
                else:
                    seen.add(url)
    if invalid:
        raise SystemExit('Media missing from the portable bundle. Localize and repoint the following records before export:\n'+'\n'.join(invalid))
    print(f'PASS: {count} stored image references resolve to {len(seen)} distinct bundled files.')


if __name__ == '__main__':
    audit()
