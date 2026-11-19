"""Translate persisted footer preferences into private editor and public views."""

import json

CHANNELS = ("github", "whatsapp", "discord", "website", "instagram", "facebook")


def footer_links(settings):
    # Before visibility switches existed, a configured Instagram/Facebook URL was public.
    saved = json.loads(settings.get("footer_links", "{}"))
    result = {}
    for key in CHANNELS:
        legacy = (
            settings.get(key + "_url", "") if key in ("instagram", "facebook") else ""
        )
        result[key] = saved.get(key, {"url": legacy, "visible": bool(legacy)})
    return result


def public_settings(settings):
    base = {
        key: settings[key]
        for key in (
            "website_title",
            "website_description",
            "footer_text",
            "contact_email",
            "logo_url",
        )
        if key in settings
    }
    base["footer_links"] = {
        key: pref["url"]
        for key, pref in footer_links(settings).items()
        if pref["visible"] and pref["url"]
    }
    return base
