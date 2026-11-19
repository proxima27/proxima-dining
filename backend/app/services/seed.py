"""Fictional editorial samples. Never run in production."""

import re

from app.core.config import PROD
from app.database.connection import Session
from app.models.catalog import Category, Cuisine, Item, Restaurant, RestaurantImage
from app.models.settings import Setting
from app.services.expand_catalogue import expand
from app.services.regional_collection import add_regional_collection

slug = lambda text: re.sub("[^a-z0-9]+", "-", text.lower()).strip("-")
photo = lambda k: "/images/" + k + ".jpg"
rows = [
    (
        "Maison Laurent",
        "Paris",
        "France",
        "FR",
        "French",
        "hero",
        "$$$",
        "Candlelit tables, polished walnut and a quietly expressive take on French bistro cooking.",
    ),
    (
        "Bella Napoli",
        "Milan",
        "Italy",
        "IT",
        "Italian",
        "garden",
        "$$",
        "A sunlit neighbourhood trattoria celebrating handmade pasta and the Italian table.",
    ),
    (
        "Sakura House",
        "Tokyo",
        "Japan",
        "JP",
        "Japanese",
        "tokyo",
        "$$$",
        "An intimate counter, seasonal ingredients and the considered simplicity of Japanese cooking.",
    ),
    (
        "Spice Garden",
        "Lagos",
        "Nigeria",
        "NG",
        "Nigerian",
        "bistro",
        "$$",
        "A lively gathering place for smoky rice, vibrant vegetables and West African flavours.",
    ),
    (
        "Casa Verde",
        "Mexico City",
        "Mexico",
        "MX",
        "Mexican",
        "garden",
        "$$",
        "Bright salsas and fresh tortillas bring a colourful courtyard table to life.",
    ),
    (
        "The Burger House",
        "New York",
        "United States",
        "US",
        "American",
        "salon",
        "$$",
        "A neighbourhood dining room with crisp-edged burgers and a seasonal kitchen.",
    ),
    (
        "Saffron Room",
        "London",
        "United Kingdom",
        "GB",
        "Indian",
        "bistro",
        "$$$",
        "Slow-cooked spices and fragrant rice in a softly lit dining room.",
    ),
    (
        "Olive & Salt",
        "Athens",
        "Greece",
        "GR",
        "Mediterranean",
        "terrace",
        "$$",
        "A coastal palette of herbs, citrus and olive oil.",
    ),
    (
        "Atelier du Soir",
        "Lyon",
        "France",
        "FR",
        "French",
        "salon",
        "$$$",
        "An evening salon for classic French cooking.",
    ),
    (
        "Cortile Rosso",
        "Rome",
        "Italy",
        "IT",
        "Italian",
        "garden",
        "$$",
        "Rustic pasta and antipasti served with a Roman accent.",
    ),
    (
        "Kumo Table",
        "Kyoto",
        "Japan",
        "JP",
        "Japanese",
        "tokyo",
        "$$$$",
        "Delicate broths and seasonal plates in a compact dining room.",
    ),
    (
        "Ember Court",
        "Abuja",
        "Nigeria",
        "NG",
        "Nigerian",
        "bistro",
        "$$",
        "A contemporary kitchen built around the warmth of the grill.",
    ),
]
menus = {
    "French": (
        "Herb-roasted chicken",
        "Onion soup",
        "Market greens",
        "Vanilla custard",
        "Blackcurrant spritz",
    ),
    "Italian": (
        "Basil farfalle",
        "Tomato bruschetta",
        "Burrata salad",
        "Berry panna cotta",
        "Citrus soda",
    ),
    "Japanese": (
        "Salmon maki",
        "Miso broth",
        "Sesame greens",
        "Matcha custard",
        "Iced sencha",
    ),
    "Nigerian": (
        "Smoky jollof rice",
        "Plantain bites",
        "Garden salad",
        "Coconut pudding",
        "Zobo cooler",
    ),
    "Mexican": (
        "Roasted corn tacos",
        "Salsa trio",
        "Avocado salad",
        "Cinnamon flan",
        "Lime agua fresca",
    ),
    "American": (
        "House cheeseburger",
        "Corn fritters",
        "Chopped salad",
        "Berry sundae",
        "Lemon soda",
    ),
    "Indian": (
        "Butter chicken",
        "Onion pakora",
        "Cucumber salad",
        "Rice pudding",
        "Mango lassi",
    ),
    "Mediterranean": (
        "Lemon herb fish",
        "Whipped feta",
        "Village salad",
        "Honey yoghurt",
        "Mint lemonade",
    ),
}
photos = dict(
    zip(
        menus, ["terrace", "pasta", "sushi", "bar", "tacos", "burger", "curry", "salad"]
    )
)
cats = ["Main courses", "Starters", "Salads", "Desserts", "Drinks"]


def seed():
    if PROD:
        raise SystemExit("Demo seed disabled in production")
    with Session.begin() as db:
        for i, (name, city, country, code, cu, img, price, desc) in enumerate(rows):
            cuisine = db.query(Cuisine).filter_by(slug=slug(cu)).first()
            if not cuisine:
                cuisine = Cuisine(
                    name=cu,
                    slug=slug(cu),
                    description=f"Explore our selection of {cu.lower()} cooking, from familiar favourites to seasonal specialities.",
                    image_url=photo(photos[cu]),
                )
                db.add(cuisine)
            if db.query(Restaurant).filter_by(slug=slug(name)).first():
                continue
            r = Restaurant(
                name=name,
                slug=slug(name),
                city=city,
                country=country,
                country_code=code,
                cuisines=[cuisine],
                description=desc,
                image_url=photo("salon" if i == 0 else img),
                price_category=price,
                is_featured=i < 4,
                is_published=True,
            )
            db.add(r)
            db.flush()
            for n, image in enumerate([img, "terrace"]):
                db.add(
                    RestaurantImage(
                        restaurant_id=r.id,
                        image_url=photo(image),
                        caption=["The dining room", "At the table"][n],
                        display_order=n,
                    )
                )
            for j, dish in enumerate(menus[cu]):
                cat = db.query(Category).filter_by(slug=slug(cats[j])).first()
                if not cat:
                    cat = Category(
                        name=cats[j],
                        slug=slug(cats[j]),
                        description="Discover "
                        + cats[j].lower()
                        + " from our dining collection.",
                        image_url=photo(
                            ["pasta", "bar", "salad", "dessert", "terrace"][j]
                        ),
                        display_order=j,
                    )
                    db.add(cat)
                    db.flush()
                db.add(
                    Item(
                        restaurant_id=r.id,
                        category_id=cat.id,
                        name=dish,
                        slug=r.slug + "-" + slug(dish),
                        description=f"{dish}, from the {cats[j].lower()} selection at {name}.",
                        image_url=photo(
                            [photos[cu], "bar", "salad", "dessert", "terrace"][j]
                        ),
                        price=[24, 10, 12, 9, 6][j]
                        * {"JP": 115, "NG": 680, "MX": 16}.get(code, 1),
                        currency={
                            "JP": "JPY",
                            "NG": "NGN",
                            "MX": "MXN",
                            "GB": "GBP",
                            "US": "USD",
                        }.get(code, "EUR"),
                        is_featured=j == 0,
                        is_published=True,
                    )
                )
        expand(db)
        add_regional_collection(db)
        expand(db, collection="grill_and_pantry.json", category_offset=11)
        expand(db, collection="eggs_and_steaks.json", category_offset=14)
        if not db.query(Setting).count():
            db.add(
                Setting(
                    setting_key="footer_text",
                    setting_value="A considered guide to the world’s most distinctive tables.",
                )
            )


if __name__ == "__main__":
    seed()
