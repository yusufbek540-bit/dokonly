from datetime import UTC, datetime

from app.services.customer_crm import add_note, add_tag, normalize_crm, remove_note, remove_tag


def test_normalize_crm_ignores_malformed_values():
    assert normalize_crm({"tags": [" VIP ", "", 123], "notes": [{"content": "missing id"}]}) == {
        "tags": ["VIP"],
        "notes": [],
    }


def test_notes_can_be_added_and_removed_without_losing_tags():
    crm = {"tags": ["VIP"], "notes": []}

    updated, note = add_note(
        crm,
        "Call after delivery",
        note_id="note-1",
        now=datetime(2026, 5, 26, 9, 30, tzinfo=UTC),
    )

    assert note == {
        "id": "note-1",
        "content": "Call after delivery",
        "created_at": "2026-05-26T09:30:00+00:00",
    }
    assert updated["tags"] == ["VIP"]
    assert updated["notes"] == [note]
    assert remove_note(updated, "note-1") == {"tags": ["VIP"], "notes": []}


def test_tags_are_trimmed_deduplicated_and_removed_case_insensitively():
    crm = {"tags": ["VIP"], "notes": []}

    crm = add_tag(crm, " vip ")
    crm = add_tag(crm, "Wholesale")
    crm = add_tag(crm, "")

    assert crm["tags"] == ["VIP", "Wholesale"]
    assert remove_tag(crm, "wholesale") == {"tags": ["VIP"], "notes": []}
