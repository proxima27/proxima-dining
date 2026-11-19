"""Integration tests against a migrated, seeded development MySQL database.
An outer transaction rolls back every case; refuse production connections.
"""

from datetime import timedelta

import pytest
from app.core.config import PROD
from app.core.limits import _buckets
from app.core.security import now
from app.database.connection import db_session, engine
from app.main import app
from app.models.catalog import AdminSession, Subscriber
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

assert not PROD
P = "/api/v1"
A = P + "/admin"


@pytest.fixture
def state():
    with engine.connect() as con:
        tx = con.begin()
        s = Session(
            bind=con, join_transaction_mode="create_savepoint", expire_on_commit=False
        )

        def dependency():
            try:
                yield s
            except Exception:
                s.rollback()
                raise

        app.dependency_overrides[db_session] = dependency
        _buckets.clear()
        try:
            with TestClient(app) as c:
                yield c, s
        finally:
            app.dependency_overrides.clear()
            s.close()
            tx.rollback()


@pytest.fixture
def staff(state):
    c, s = state
    r = c.post(
        A + "/auth/login",
        headers={"X-CSRF-Token": "login"},
        json={"username": "admin", "password": "admin123"},
    )
    assert r.status_code == 200
    c.headers["X-CSRF-Token"] = r.json()["csrf"]
    return c


def test_health_catalogue(state):
    c, s = state
    assert c.get(P + "/health").json()["database"] == "connected"
    assert s.execute(text("SELECT DATABASE()")).scalar() == "proxima_dining"
    for route in [
        "/cuisines",
        "/categories",
        "/menu-items",
        "/restaurants/featured",
        "/restaurants/destinations",
        "/restaurants/maison-laurent/menu",
        "/cuisines/french",
        "/categories/main-courses",
    ]:
        assert c.get(P + route).status_code == 200
    a = c.get(P + "/restaurants?size=3").json()
    b = c.get(P + "/restaurants?size=3&page=2").json()
    assert len(a["items"]) == 3 and {x["id"] for x in a["items"]}.isdisjoint(
        x["id"] for x in b["items"]
    )
    assert (
        c.get(
            P
            + "/restaurants?city=Tokyo&country=Japan&cuisine=japanese&price_category=$$$&featured=true"
        ).json()["total"]
        >= 1
    )
    res = c.get(P + "/search?q=Japan").json()
    assert all(res[k] for k in ("restaurants", "dishes", "cuisines", "destinations"))
    assert c.get(P + "/restaurants/missing-abc").status_code == 404
    assert c.get(P + "/restaurants?page=0").status_code == 422


def test_public_writes(state):
    c, s = state
    v = {"email": "test@example.org"}
    assert (
        c.post(
            P + "/contact",
            json={"name": "Tester", **v, "message": "Hello", "subject": "Question"},
        ).status_code
        == 201
    )
    assert (
        c.post(
            P + "/contact", json={"name": "", "email": "oops", "message": ""}
        ).status_code
        == 422
    )
    for _ in range(2):
        assert c.post(P + "/newsletter/subscribe", json=v).status_code == 200
    assert s.query(Subscriber).filter_by(**v).count() == 1
    c.post(P + "/newsletter/unsubscribe", json=v)
    assert not s.query(Subscriber).filter_by(**v).one().is_active


@pytest.mark.parametrize(
    "path",
    [
        "/dashboard",
        "/restaurants",
        "/cuisines",
        "/categories",
        "/menu-items",
        "/gallery",
        "/settings",
        "/messages",
        "/newsletter",
        "/auth/me",
    ],
)
def test_protected(state, path):
    assert state[0].get(A + path).status_code == 401


def test_logout(staff):
    c = staff
    assert c.get(A + "/auth/me").status_code == 200
    assert (
        c.post(A + "/auth/logout", headers={"X-CSRF-Token": "wrong"}).status_code == 403
    )
    assert c.post(A + "/auth/logout").status_code == 200
    assert c.get(A + "/auth/me").status_code == 401


def test_expired_session(staff, state):
    c, s = state
    s.query(AdminSession).update({"expires_at": now() - timedelta(minutes=1)})
    s.commit()
    assert c.get(A + "/auth/me").status_code == 401


def test_bad_login_and_rate_limit(state):
    c, _ = state
    for i in range(11):
        r = c.post(
            A + "/auth/login",
            headers={"X-CSRF-Token": "login"},
            json={"username": "admin", "password": "wrong"},
        )
        assert r.status_code == (401 if i < 10 else 429)


def test_cms_public_roundtrip(staff):
    c = staff
    new = lambda n: {
        "name": n,
        "slug": "test-" + n.lower(),
        "description": "Test entry",
    }

    def create(k, d):
        r = c.post(A + "/" + k, json=d)
        assert r.status_code == 200, r.text
        return r.json()["id"]

    cu = create("cuisines", new("Culinary"))
    cat = create("categories", new("Course"))
    rd = {
        **new("Dining"),
        "city": "Lagos",
        "country": "Nigeria",
        "cuisine_ids": [cu],
        "is_published": True,
        "hours": [{"day_of_week": 0, "opens_at": "12:00", "closes_at": "18:00"}],
    }
    rid = create("restaurants", rd)
    md = {
        **new("Plate"),
        "restaurant_id": rid,
        "category_id": cat,
        "price": "12.30",
        "currency": "NGN",
        "is_published": True,
        "tags": ["Test label"],
    }
    mid = create("menu-items", md)
    assert c.get(P + "/restaurants/test-dining").json()["cuisines"] == ["Culinary"]
    assert c.get(P + "/restaurants/test-dining/menu").json()[0]["id"] == mid
    for kind, id, val in [
        ("cuisines", cu, new("Culinary")),
        ("categories", cat, new("Course")),
        ("restaurants", rid, rd),
        ("menu-items", mid, md),
    ]:
        assert (
            c.put(f"{A}/{kind}/{id}", json={**val, "description": "Edited"}).status_code
            == 200
        )
    assert c.get(P + "/menu-items/test-plate").json()["description"] == "Edited"
    assert c.delete(f"{A}/cuisines/{cu}").status_code == 409
    gd = {
        "image_url": "/images/salon.jpg",
        "caption": "Dining room",
        "restaurant_id": rid,
    }
    g = c.post(A + "/gallery", json=gd)
    assert g.status_code == 201
    gid = g.json()["id"]
    assert (
        c.put(
            f"{A}/gallery/restaurant/{gid}", json={**gd, "caption": "Edited caption"}
        ).status_code
        == 200
    )
    assert (
        c.get(P + "/restaurants/test-dining").json()["gallery"][0]["caption"]
        == "Edited caption"
    )
    assert c.delete(f"{A}/gallery/restaurant/{gid}").status_code == 200
    assert (
        c.put(f"{A}/restaurants/{rid}", json={**rd, "is_published": False}).status_code
        == 200
    )
    assert c.get(P + "/restaurants/test-dining").status_code == 404
    assert c.get(P + "/menu-items/test-plate").status_code == 404
    assert c.get(P + "/search?q=test-dining").json()["dishes"] == []
    for kind, id in [
        ("menu-items", mid),
        ("restaurants", rid),
        ("categories", cat),
        ("cuisines", cu),
    ]:
        assert c.delete(f"{A}/{kind}/{id}").status_code == 200


def test_upload_validation(staff):
    assert (
        staff.post(
            A + "/gallery/upload",
            files={"file": ("fake.jpg", b"not a photo", "image/jpeg")},
        ).status_code
        == 422
    )


def test_settings_messages(staff):
    c = staff
    assert (
        c.put(A + "/settings", json={"footer_text": "A new note."}).status_code == 200
    )
    assert c.get(P + "/settings").json()["footer_text"] == "A new note."
    c.post(
        P + "/contact",
        json={
            "name": "Tester",
            "email": "hello@example.org",
            "subject": "Testing",
            "message": "A note",
        },
    )
    msg = c.get(A + "/messages").json()[0]
    assert c.patch(f"{A}/messages/{msg['id']}").json()["is_read"]
    assert c.delete(f"{A}/messages/{msg['id']}").status_code == 200


def test_individual_dish_images_and_regional_menus(state):
    from pathlib import Path
    from hashlib import sha256
    from app.models.catalog import Item

    c, s = state
    urls = [url for (url,) in s.query(Item.image_url)]
    assert len(urls) == len(set(urls))
    assets = Path(__file__).resolve().parents[2] / "frontend/public"
    demo_files = [
        assets / url.lstrip("/") for url in urls if url.startswith("/images/")
    ]
    assert len({sha256(path.read_bytes()).digest() for path in demo_files}) == len(
        demo_files
    )
    garri = c.get(P + "/restaurants/the-garri-bowl/menu").json()
    assert {x["name"] for x in garri} >= {
        "Soaked Garri with Groundnuts",
        "Yellow Eba & Egusi Soup",
    }
    pizzas = c.get(P + "/menu-items?category=pizza").json()["items"]
    assert len(pizzas) >= 6 and all(x["currency"] == "EUR" for x in pizzas)
    for dish in garri + pizzas:
        assert (
            c.get(P + "/menu-items/" + dish["slug"]).json()["image_url"]
            == dish["image_url"]
        )


def test_reused_dish_photo_rejected(staff):
    m = staff.get(A + "/menu-items").json()[0]
    r = staff.post(
        A + "/menu-items",
        json={
            "name": "Test duplicate photo",
            "slug": "test-dupe-photo",
            "image_url": m["image_url"],
            "category_id": m["category_id"],
            "restaurant_id": m["restaurant_id"],
        },
    )
    assert r.status_code == 409


def test_footer_switches_and_private_drafts(staff, state):
    links = {
        "github": {"url": "https://github.com/example", "visible": True},
        "whatsapp": {"url": "https://wa.me/123456789", "visible": False},
        "discord": {"url": "https://discord.gg/example", "visible": True},
        "website": {"url": "https://example.org/", "visible": False},
    }

    def save(v):
        return staff.put(
            A + "/settings", json={"footer_text": "Test footer", "footer_links": v}
        )

    def published():
        return state[0].get(P + "/settings").json()

    assert save(links).status_code == 200
    first = published()
    assert (
        first["footer_links"]["github"] == links["github"]["url"]
        and "whatsapp" not in first["footer_links"]
        and "website" not in first["footer_links"]
    )
    assert "https://wa.me/123456789" not in str(first)
    assert (
        staff.get(A + "/settings").json()["footer_links"]["whatsapp"]
        == links["whatsapp"]
    )
    assert (
        save(
            {
                "github": {**links["github"], "visible": False},
                "website": {**links["website"], "visible": True},
            }
        ).status_code
        == 200
    )
    active = published()["footer_links"]
    assert (
        "github" not in active
        and active["website"] == links["website"]["url"]
        and active["discord"] == links["discord"]["url"]
    )
    assert save({"github": {"url": "", "visible": True}}).status_code == 422
    assert (
        save({"website": {"url": "javascript:alert(1)", "visible": True}}).status_code
        == 422
    )
    assert not staff.get(A + "/settings").json()["footer_links"]["github"]["visible"]


def test_grill_and_pantry_search(state):
    c, _ = state
    for q in ("Indomie", "ribeye", "biscuits", "banga", "fried rice"):
        assert c.get(P + "/search", params={"q": q}).json()["dishes"]
    for cat, n in [("biscuits", 3), ("fried-rice", 4), ("steaks-grills", 4)]:
        assert c.get(P + "/menu-items", params={"category": cat}).json()["total"] >= n


def test_egg_and_steak_collection(state):
    c, _ = state
    eggs = c.get(P + "/menu-items", params={"category": "eggs", "size": 40}).json()
    assert eggs["total"] >= 19
    assert {i["name"] for i in eggs["items"]} >= {
        "Nigerian Egg Roll",
        "Boiled Yam & Egg Sauce",
        "Classic Eggs Benedict",
        "Tamagoyaki Rolled Egg Omelette",
    }
    assert "Nigerian Egg Roll" in {
        x["name"] for x in c.get(P + "/search?q=eggs").json()["dishes"]
    }
    steaks = c.get(
        P + "/menu-items", params={"category": "steaks-grills", "size": 40}
    ).json()
    assert {i["name"] for i in steaks["items"]} >= {
        "Long-Bone Tomahawk Steak",
        "New York Strip Steak",
        "Chargrilled Ribeye Steak",
        "Yaji Steak & Eggs",
    }
    combo = c.get(P + "/menu-items/copper-ladle-breakfast-club-yaji-steak-eggs").json()
    assert combo["currency"] == "NGN" and combo["category"] == "Steaks & Grills"
