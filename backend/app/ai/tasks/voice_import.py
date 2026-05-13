import io
import json

from app.ai.client import openai

_LOCALE_LANG = {"ru": "Russian", "uz": "Uzbek", "en": "English"}


async def transcribe_voice(audio_bytes: bytes) -> str:
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "voice.ogg"
    transcript = await openai.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        language=None,
    )
    return transcript.text


async def extract_products_from_text(text: str, locale: str = "ru") -> list[dict]:
    lang = _LOCALE_LANG.get(locale, "Russian")
    response = await openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    f"Extract a list of products from the text. "
                    f"Return JSON: {{\"products\": [{{\"name\": str, \"price\": number|null, \"description\": str|null}}]}}. "
                    f"Text is in {lang}. If price not mentioned, use null."
                ),
            },
            {"role": "user", "content": text},
        ],
        response_format={"type": "json_object"},
        max_tokens=500,
    )
    data = json.loads(response.choices[0].message.content)
    return data.get("products", []) if isinstance(data, dict) else []
