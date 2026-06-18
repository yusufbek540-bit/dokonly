def category_payload(category) -> dict:
    return {
        "id": str(getattr(category, "id")),
        "tenant_id": str(getattr(category, "tenant_id")),
        "name": getattr(category, "name"),
        "slug": getattr(category, "slug"),
        "sort_order": getattr(category, "sort_order"),
        "image_url": getattr(category, "image_url", None),
    }
