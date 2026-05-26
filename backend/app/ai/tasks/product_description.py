from app.ai.client import get_openai_client

_LOCALE_LANG = {"ru": "Russian", "uz": "Uzbek", "en": "English"}


async def generate_description(name: str, locale: str = "ru") -> str:
    lang = _LOCALE_LANG.get(locale, "Russian")
    response = await get_openai_client().chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    f"You write short, compelling product descriptions for a Telegram shop. "
                    f"Write in {lang}. 2-3 sentences max. No marketing fluff, be specific and helpful."
                ),
            },
            {"role": "user", "content": f"Write a description for: {name}"},
        ],
        max_tokens=150,
    )
    return response.choices[0].message.content.strip()
