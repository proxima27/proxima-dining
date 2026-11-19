from datetime import time
from decimal import Decimal

from pydantic import BaseModel


class EntryRead(BaseModel):
    id: int
    name: str
    slug: str
    image_url: str
    description: str


class RestaurantRead(EntryRead):
    city: str
    country: str
    cuisines: list[str]
    price_category: str
    is_featured: bool


class RestaurantPage(BaseModel):
    items: list[RestaurantRead]
    total: int
    page: int
    size: int


class DishRead(EntryRead):
    restaurant_id: int
    category_id: int
    restaurant: str
    restaurant_slug: str
    category: str
    price: Decimal | None
    currency: str | None
    tags: list[str]
    ingredients: str | None
    allergen_information: str | None
    is_featured: bool


class DishPage(BaseModel):
    items: list[DishRead]
    total: int


class ImageRead(BaseModel):
    id: int
    image_url: str
    caption: str | None
    display_order: int


class HourRead(BaseModel):
    day_of_week: int
    opens_at: time | None
    closes_at: time | None
    is_closed: bool


class RestaurantDetail(RestaurantRead):
    country_code: str | None
    address: str | None
    phone: str | None
    contact_email: str | None
    website_url: str | None
    instagram_url: str | None
    facebook_url: str | None
    logo_url: str | None
    latitude: Decimal | None
    longitude: Decimal | None
    timezone: str | None
    hours: list[HourRead]
    gallery: list[ImageRead]
    similar: list[RestaurantRead]


class Spotlight(RestaurantRead):
    spotlight_image: str


class DishDetail(DishRead):
    gallery: list[ImageRead]
    similar: list[DishRead]


class Destination(BaseModel):
    city: str
    country: str


class Results(BaseModel):
    restaurants: list[RestaurantRead]
    cuisines: list[EntryRead]
    dishes: list[DishRead]
    destinations: list[Destination]
