import base64
import json
from typing import Optional

from pydantic import BaseModel

from app.ai.client import openai

_LOCALE_LANG = {"ru": "Russian", "uz": "Uzbek", "en": "English"}


class ExtractedProduct(BaseModel):
    name: str
    price: Optional[float] = None
    description: Optional[str] = None


async def extract_product_from_photo(
    image_bytes: bytes, caption: str = "", locale: str = "ru"
) -> ExtractedProduct:
    lang = _LOCALE_LANG.get(locale, "Russian")
    image_b64 = base64.b64encode(image_bytes).decode()

    response = await openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                    },
                    {
                        "type": "text",
                        "text": (
                            f"Extract product info from this image and caption. "
                            f"Caption: '{caption}'. "
                            f"Return JSON: {{\"name\": str, \"price\": number|null, \"description\": str (in {lang}, 1-2 sentences)}}. "
                            f"If price is missing, use null."
                        ),
                    },
                ],
            }
        ],
        response_format={"type": "json_object"},
        max_tokens=200,
    )
    data = json.loads(response.choices[0].message.content)
    return ExtractedProduct(**data)
