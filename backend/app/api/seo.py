from xml.etree.ElementTree import Element, SubElement, tostring

from fastapi import APIRouter, Depends, Response

from app.core.config import ORIGIN
from app.database.connection import db_session
from app.models.catalog import Category, Cuisine, Item, Restaurant
from app.services.catalog import public

api = APIRouter(prefix="/api/v1")


@api.get("/sitemap.xml", include_in_schema=False)
def sitemap(db=Depends(db_session)):
    root = Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    paths = [
        "/",
        "/restaurants",
        "/cuisines",
        "/categories",
        "/about",
        "/contact",
        "/privacy",
        "/terms",
    ]
    for prefix, m in [
        ("restaurants", Restaurant),
        ("food", Item),
        ("cuisines", Cuisine),
        ("categories", Category),
    ]:
        paths.extend(
            "/" + prefix + "/" + s for (s,) in public(db, m).with_entities(m.slug)
        )
    for path in paths:
        SubElement(SubElement(root, "url"), "loc").text = ORIGIN.rstrip("/") + path
    return Response(
        tostring(root, encoding="utf-8", xml_declaration=True),
        media_type="application/xml",
    )
