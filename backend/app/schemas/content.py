import re
from datetime import time
from decimal import Decimal
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    HttpUrl,
    field_validator,
    model_validator,
)


def safe_image(v):
    if (
        not v
        or re.fullmatch(r"/images/[\w.-]+", v)
        or (v.startswith("https://") and urlsplit(v).hostname)
    ):
        return v
    raise ValueError("Use an HTTPS image URL or a local catalogue image")


ImageURL = Annotated[str, Field(max_length=1024), AfterValidator(safe_image)]


class Data(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Entry(Data):
    name: str = Field(min_length=1, max_length=160)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=180)
    description: str = Field(default="", max_length=10000)
    image_url: ImageURL = ""


class Hour(Data):
    day_of_week: int = Field(ge=0, le=6)
    opens_at: time | None = None
    closes_at: time | None = None
    is_closed: bool = False

    @model_validator(mode="after")
    def times(self):
        if not self.is_closed and (self.opens_at is None or self.closes_at is None):
            raise ValueError("Opening and closing times required")
        return self


class RestaurantData(Entry):
    city: str = Field(min_length=1, max_length=100)
    country: str = Field(min_length=1, max_length=100)
    country_code: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    cuisine_ids: list[int] = Field(default_factory=list, max_length=24)
    price_category: Literal["$", "$$", "$$$", "$$$$"] = "$$"
    is_featured: bool = False
    is_published: bool = False
    address: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    website_url: str | None = None
    instagram_url: str | None = None
    facebook_url: str | None = None
    logo_url: ImageURL | None = None
    contact_email: EmailStr | None = None
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    timezone: str | None = Field(default=None, max_length=80)
    hours: list[Hour] = Field(default_factory=list, max_length=28)

    @field_validator("website_url", "instagram_url", "facebook_url")
    @classmethod
    def url(cls, v):
        if v and (
            not v.startswith("https://") or not urlsplit(v).hostname or len(v) > 1024
        ):
            raise ValueError("Use an HTTPS URL")
        return v


class CategoryData(Entry):
    display_order: int = Field(default=0, ge=0, le=9999)


class DishData(Entry):
    restaurant_id: int = Field(gt=0)
    category_id: int = Field(gt=0)
    price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    currency: str | None = Field(default=None, pattern="^[A-Z]{3}$")
    ingredients: str | None = Field(default=None, max_length=5000)
    allergen_information: str | None = Field(default=None, max_length=5000)
    tags: list[Annotated[str, Field(min_length=1, max_length=80)]] = Field(
        default_factory=list, max_length=20
    )
    is_featured: bool = False
    is_published: bool = False

    @model_validator(mode="after")
    def money(self):
        if self.price is not None and not self.currency:
            raise ValueError("Supply currency with price")
        return self


class FooterLink(Data):
    url: str = Field(default="", max_length=1024)
    visible: bool = False

    @field_validator("url")
    @classmethod
    def https_only(cls, value):
        if not value:
            return value
        if (
            not value.startswith("https://")
            or "\\" in value
            or any(c.isspace() or ord(c) < 32 for c in value)
        ):
            raise ValueError("Enter a full HTTPS link.")
        parsed = HttpUrl(value)
        if not parsed.host or parsed.username or parsed.password:
            raise ValueError("Use a link with a host and no embedded credentials.")
        return value

    @model_validator(mode="after")
    def has_target(self):
        if self.visible and not self.url:
            raise ValueError("Add a URL before showing this button.")
        return self


class SettingData(Data):
    footer_links: (
        dict[
            Literal[
                "github", "whatsapp", "discord", "website", "instagram", "facebook"
            ],
            FooterLink,
        ]
        | None
    ) = None
    footer_text: str = Field(max_length=600)
    website_title: str = Field(default="Proxima Dining", min_length=1, max_length=80)
    website_description: str = Field(default="", max_length=320)
    contact_email: EmailStr | None = None
    logo_url: ImageURL = ""

    instagram_url: str = Field(default="", max_length=1024)
    facebook_url: str = Field(default="", max_length=1024)

    @field_validator("instagram_url", "facebook_url")
    @classmethod
    def social(cls, v):
        if v and (not v.startswith("https://") or not urlsplit(v).hostname):
            raise ValueError("Use an HTTPS URL")
        return v
