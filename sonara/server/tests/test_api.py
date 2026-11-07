"""Covers the exact HTTP contract the Android client depends on."""
from __future__ import annotations

import time

import pytest


def wait_for(client, job_id: str, timeout: float = 240.0) -> dict:
    deadline = time.time() + timeout
    job = {}
    while time.time() < deadline:
        job = client.get(f"/v1/jobs/{job_id}").json()
        if job["status"] in {"succeeded", "failed", "cancelled"}:
            return job
        time.sleep(0.5)
    pytest.fail(f"job {job_id} did not finish: {job}")


def test_health_reports_an_engine(client):
    body = client.get("/v1/health").json()
    assert body["status"] == "ok"
    assert body["engine"]
    assert body["version"]


def test_models_are_listed(client):
    models = client.get("/v1/models").json()["models"]
    assert models
    assert all({"id", "name", "max_duration_seconds"} <= set(m) for m in models)


def test_engines_endpoint_reports_availability(client):
    engines = client.get("/v1/engines").json()["engines"]
    names = {e["name"] for e in engines}
    assert {"sonara-offline", "ace-step", "musicgen", "remote"} <= names
    assert any(e["available"] for e in engines)


def test_lyrics_are_structured(client):
    body = client.post(
        "/v1/lyrics",
        json={"prompt": "driving home at 4am", "language": "en", "style": "synthwave"},
    ).json()
    assert body["title"]
    assert "[Chorus]" in body["lyrics"]
    assert len(body["lyrics"].splitlines()) > 8


def test_empty_generate_is_rejected(client):
    assert client.post("/v1/generate", json={"model": "sonara-offline-v1"}).status_code == 422


def test_unknown_job_is_404(client):
    assert client.get("/v1/jobs/nope").status_code == 404


@pytest.mark.slow
def test_generate_produces_playable_clips(client):
    job = client.post(
        "/v1/generate",
        json={
            "prompt": "dark trap beat about winter",
            "style": "trap, dark, 808 bass",
            "lyrics": "[Verse]\nCold light on the window pane\n[Chorus]\nWe keep moving, we keep moving",
            "duration_seconds": 30,
            "num_variations": 2,
            "seed": 123,
        },
    ).json()
    assert job["status"] in {"queued", "running"}

    done = wait_for(client, job["id"])
    assert done["status"] == "succeeded", done.get("error")
    assert len(done["clips"]) == 2

    for clip in done["clips"]:
        assert clip["duration_seconds"] > 20
        audio = client.get(clip["audio_url"])
        assert audio.status_code == 200
        assert audio.headers["content-type"] == "audio/mpeg"
        assert len(audio.content) > 50_000
        if clip.get("image_url"):
            assert client.get(clip["image_url"]).status_code == 200


@pytest.mark.slow
def test_extend_and_stems(client):
    job = client.post(
        "/v1/generate",
        json={"prompt": "lo-fi study beat", "duration_seconds": 25, "num_variations": 1, "seed": 7},
    ).json()
    done = wait_for(client, job["id"])
    assert done["status"] == "succeeded"
    clip_id = done["clips"][0]["id"]
    original = done["clips"][0]["duration_seconds"]

    extend = client.post(
        "/v1/extend",
        json={"clip_id": clip_id, "continue_at_seconds": 10.0, "duration_seconds": 20},
    ).json()
    extended = wait_for(client, extend["id"])
    assert extended["status"] == "succeeded"
    assert extended["clips"][0]["duration_seconds"] > original * 0.8

    stems = client.post("/v1/stems", json={"clip_id": clip_id, "mode": "two_stem"}).json()
    split = wait_for(client, stems["id"])
    assert split["status"] == "succeeded"
    assert len(split["clips"]) >= 2
