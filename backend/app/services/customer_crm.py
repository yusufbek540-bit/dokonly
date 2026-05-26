import uuid
from datetime import UTC, datetime


def normalize_crm(value):
    """Return the stable CRM payload shape stored on customers.crm."""
    source = value if isinstance(value, dict) else {}
    tags = []
    seen_tags = set()
    for raw_tag in source.get("tags", []):
        if not isinstance(raw_tag, str):
            continue
        tag = raw_tag.strip()
        tag_key = tag.lower()
        if tag and tag_key not in seen_tags:
            tags.append(tag)
            seen_tags.add(tag_key)

    notes = []
    for raw_note in source.get("notes", []):
        if not isinstance(raw_note, dict):
            continue
        note_id = raw_note.get("id")
        content = raw_note.get("content")
        created_at = raw_note.get("created_at")
        parts = (note_id, content, created_at)
        if not all(isinstance(part, str) and part.strip() for part in parts):
            continue
        notes.append(
            {
                "id": note_id.strip(),
                "content": content.strip(),
                "created_at": created_at.strip(),
            }
        )

    return {"tags": tags, "notes": notes}


def add_note(value, content, note_id=None, now=None):
    content = content.strip() if isinstance(content, str) else ""
    if not content:
        raise ValueError("Note content is required")

    crm = normalize_crm(value)
    note = {
        "id": str(note_id or uuid.uuid4()),
        "content": content,
        "created_at": (now or datetime.now(UTC)).isoformat(),
    }
    return {**crm, "notes": [*crm["notes"], note]}, note


def remove_note(value, note_id):
    crm = normalize_crm(value)
    note_id = str(note_id)
    return {**crm, "notes": [note for note in crm["notes"] if note["id"] != note_id]}


def add_tag(value, tag):
    crm = normalize_crm(value)
    tag = tag.strip() if isinstance(tag, str) else ""
    if not tag:
        return crm
    if tag.lower() in {existing.lower() for existing in crm["tags"]}:
        return crm
    return {**crm, "tags": [*crm["tags"], tag]}


def remove_tag(value, tag):
    crm = normalize_crm(value)
    tag_key = tag.lower() if isinstance(tag, str) else ""
    return {**crm, "tags": [existing for existing in crm["tags"] if existing.lower() != tag_key]}
