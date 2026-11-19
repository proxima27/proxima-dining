import io
import json
import os
import re
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image
from pydantic import Field, model_validator
from sqlalchemy import case, func

from app.core.security import authorized
from app.database.connection import db_session
from app.models.catalog import (
    Category,
    Cuisine,
    Hours,
    Item,
    ItemImage,
    Message,
    Restaurant,
    RestaurantImage,
    Subscriber,
    Tag,
)
from app.models.settings import Setting
from app.schemas.content import (
    CategoryData,
    Data,
    DishData,
    Entry,
    ImageURL,
    RestaurantData,
    SettingData,
)
from app.services.catalog import card, one, row
from app.services.footer import footer_links

api = APIRouter(prefix="/api/v1/admin", dependencies=[Depends(authorized)])
D = Depends(db_session)
types = {
    "restaurants": Restaurant,
    "cuisines": Cuisine,
    "categories": Category,
    "menu-items": Item,
    "messages": Message,
    "newsletter": Subscriber,
}


@api.get("/messages/summary")
def message_summary(db=D):
    total, unread, latest = db.query(
        func.count(Message.id),
        func.count(case((Message.is_read.is_(False), 1))),
        func.max(Message.id),
    ).one()
    return {"total": total, "unread": unread, "latest": latest}


@api.get("/dashboard")
def stats(db=D):
    return {k: db.query(m).count() for k, m in types.items()}


@api.get("/settings")
def settings(db=D):
    values = {s.setting_key: s.setting_value for s in db.query(Setting)}
    return {**values, "footer_links": footer_links(values)}


@api.put("/settings")
def write_settings(data: SettingData, db=D):
    for k, v in data.model_dump(exclude_unset=True).items():
        if k == "footer_links":
            if v is None:
                continue
            v = json.dumps({**settings(db)["footer_links"], **v})
        s = db.query(Setting).filter_by(setting_key=k).first()
        if not s:
            s = Setting(setting_key=k)
            db.add(s)
        s.setting_value = v or ""
    db.commit()
    return settings(db)


class GalleryData(Data):
    image_url: ImageURL
    restaurant_id: int | None = Field(default=None, gt=0)
    menu_item_id: int | None = Field(default=None, gt=0)
    caption: str = Field(default="", max_length=255)
    display_order: int = Field(default=0, ge=0, le=9999)

    @model_validator(mode="after")
    def parent(self):
        if bool(self.restaurant_id) == bool(self.menu_item_id) or not self.image_url:
            raise ValueError("Select one image owner and an image")
        return self


@api.get("/gallery")
def gallery(db=D):
    return [
        dict(row(x), kind=k)
        for m, k in [(RestaurantImage, "restaurant"), (ItemImage, "dish")]
        for x in db.query(m).order_by(m.display_order)
    ]


@api.post("/gallery/upload")
async def upload(file: UploadFile = File(...)):
    raw = await file.read(5 * 1024 * 1024 + 1)
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(413, "Image exceeds 5 MB.")
    try:
        im = Image.open(io.BytesIO(raw))
        if (
            im.format not in ("JPEG", "PNG", "WEBP")
            or im.width * im.height > 20_000_000
        ):
            raise ValueError()
        im.load()
        im.thumbnail((2000, 2000))
        out = io.BytesIO()
        im.convert("RGB").save(out, "JPEG", quality=86)
        out.seek(0)
    except Exception:
        raise HTTPException(
            422, "Choose a valid JPEG, PNG or WebP image under 20 megapixels."
        )
    if not os.getenv("CLOUDINARY_URL"):
        raise HTTPException(
            503, "Cloudinary is not configured. Enter a hosted image URL instead."
        )
    import cloudinary.uploader

    try:
        r = cloudinary.uploader.upload(
            out, resource_type="image", folder="proxima-dining", timeout=20
        )
    except Exception:
        raise HTTPException(502, "Image storage did not accept the upload.")
    return {"image_url": r["secure_url"]}


@api.post("/gallery", status_code=201)
def add_image(data: GalleryData, db=D):
    m = RestaurantImage if data.restaurant_id else ItemImage
    x = m(**data.model_dump(exclude_none=True))
    db.add(x)
    db.commit()
    return row(x)


@api.put("/gallery/{kind}/{id}")
def edit_image(kind: Literal["restaurant", "dish"], id: int, data: GalleryData, db=D):
    m = RestaurantImage if kind == "restaurant" else ItemImage
    x = one(db.query(m).filter_by(id=id))
    if bool(data.restaurant_id) != (kind == "restaurant"):
        raise HTTPException(422, "Keep the same owner type.")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(x, k, v)
    db.commit()
    return row(x)


@api.delete("/gallery/{kind}/{id}")
def remove_image(kind: Literal["restaurant", "dish"], id: int, db=D):
    db.delete(
        one(
            db.query(RestaurantImage if kind == "restaurant" else ItemImage).filter_by(
                id=id
            )
        )
    )
    db.commit()
    return {"deleted": True}


@api.patch("/messages/{id}")
def read_message(id: int, db=D):
    x = one(db.query(Message).filter_by(id=id))
    x.is_read = True
    db.commit()
    return row(x)


def install(key, model, schema):
    def listing(db=D):
        return [card(x) for x in db.query(model).order_by(model.id.desc())]

    def detail(id: int, db=D):
        x = one(db.query(model).filter_by(id=id))
        return (
            dict(card(x), hours=[row(h) for h in x.hours])
            if model == Restaurant
            else card(x)
        )

    def save(data, db, x):
        if model == Item and data.image_url:
            other = db.query(Item.id).filter(Item.image_url == data.image_url)
            if x.id is not None:
                other = other.filter(Item.id != x.id)
            if other.first():
                raise HTTPException(
                    409,
                    "Another dish already uses this photo. Choose a different dish photo.",
                )
        for k, v in data.model_dump(exclude={"tags", "cuisine_ids", "hours"}).items():
            setattr(x, k, v)
        if model == Restaurant:
            cs = db.query(Cuisine).filter(Cuisine.id.in_(data.cuisine_ids)).all()
            if len(cs) != len(set(data.cuisine_ids)):
                raise HTTPException(422, "Unknown cuisine.")
            x.cuisines = cs
        if model == Item:
            if not db.get(Restaurant, data.restaurant_id) or not db.get(
                Category, data.category_id
            ):
                raise HTTPException(422, "Unknown restaurant or category.")
            tags = []
            for name in dict.fromkeys(data.tags):
                t = db.query(Tag).filter_by(name=name).first()
                if not t:
                    t = Tag(
                        name=name,
                        slug=re.sub("[^a-z0-9]+", "-", name.lower()).strip("-"),
                    )
                    db.add(t)
                tags.append(t)
            x.tags = tags
        db.add(x)
        db.flush()
        if model == Restaurant:
            db.query(Hours).filter_by(restaurant_id=x.id).delete()
            for h in data.hours:
                db.add(Hours(restaurant_id=x.id, **h.model_dump()))
        db.commit()
        return card(x)

    def create(data: schema, db=D):
        return save(data, db, model())

    def update(id: int, data: schema, db=D):
        return save(data, db, one(db.query(model).filter_by(id=id)))

    def remove(id: int, db=D):
        db.delete(one(db.query(model).filter_by(id=id)))
        db.commit()
        return {"deleted": True}

    for path, method, fn in [
        ("", "GET", listing),
        ("/{id}", "GET", detail),
        ("/{id}", "DELETE", remove),
    ] + ([("", "POST", create), ("/{id}", "PUT", update)] if schema else []):
        api.add_api_route(
            "/" + key + path, fn, methods=[method], name=fn.__name__ + " " + key
        )


from typing import Literal

for key, schema in [
    ("restaurants", RestaurantData),
    ("cuisines", Entry),
    ("categories", CategoryData),
    ("menu-items", DishData),
    ("messages", None),
    ("newsletter", None),
]:
    install(key, types[key], schema)
