from fastapi.testclient import TestClient
import copy
import pytest

from src.app import app, activities


@pytest.fixture(autouse=True)
def client_and_restore():
    """Provide a TestClient and restore the in-memory activities after each test."""
    original = copy.deepcopy(activities)
    client = TestClient(app)
    yield client
    # restore original in-memory state
    activities.clear()
    activities.update(original)


def test_get_activities(client_and_restore):
    client = client_and_restore
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister(client_and_restore):
    client = client_and_restore
    activity_name = "Chess Club"
    email = "pytest_test_user@example.com"

    # Ensure the test email is not present before starting
    resp = client.get("/activities")
    assert resp.status_code == 200
    participants = resp.json()[activity_name]["participants"]
    if email in participants:
        participants.remove(email)

    # Sign up the user
    resp = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert resp.status_code == 200
    json_data = resp.json()
    assert "Signed up" in json_data.get("message", "")

    # Verify the participant was added
    resp = client.get("/activities")
    participants = resp.json()[activity_name]["participants"]
    assert email in participants

    # Unregister the participant
    resp = client.delete(f"/activities/{activity_name}/participant?email={email}")
    assert resp.status_code == 200
    json_data = resp.json()
    assert "Removed" in json_data.get("message", "")

    # Verify the participant was removed
    resp = client.get("/activities")
    participants = resp.json()[activity_name]["participants"]
    assert email not in participants
