"""Tests for RCA endpoints."""
from models import Rca


def test_get_rcas_empty(client, auth_headers, sample_user):
    """Test getting RCAs when none exist."""
    response = client.get("/api/rcas", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["rcas"] == []


def test_create_rca(client, auth_headers, sample_user):
    """Test creating an RCA."""
    response = client.post(
        "/api/rcas",
        json={"name": "Outage Analysis", "description": "Prod went down"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["rca"]["name"] == "Outage Analysis"
    assert data["rca"]["description"] == "Prod went down"


def test_create_rca_name_only(client, auth_headers, sample_user):
    """Test creating an RCA with only a name."""
    response = client.post(
        "/api/rcas",
        json={"name": "Quick RCA"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["rca"]["name"] == "Quick RCA"
    assert data["rca"]["description"] is None
    assert data["rca"]["timeline"] is None


def test_get_rca_with_tree(client, auth_headers, sample_user, db_session):
    """Test getting an RCA returns the full why tree."""
    rca = Rca(name="Test RCA", owner_id=sample_user.id)
    db_session.add(rca)
    db_session.commit()

    response = client.get(f"/api/rcas/{rca.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["rca"]["name"] == "Test RCA"
    assert data["rca"]["nodes"] == []


def test_update_rca(client, auth_headers, sample_user, db_session):
    """Test updating an RCA."""
    rca = Rca(name="Original", owner_id=sample_user.id)
    db_session.add(rca)
    db_session.commit()

    response = client.patch(
        f"/api/rcas/{rca.id}",
        json={"name": "Updated", "description": "Now with desc"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["rca"]["name"] == "Updated"
    assert data["rca"]["description"] == "Now with desc"


def test_delete_rca(client, auth_headers, sample_user, db_session):
    """Test deleting an RCA."""
    rca = Rca(name="To Delete", owner_id=sample_user.id)
    db_session.add(rca)
    db_session.commit()
    rca_id = rca.id

    response = client.delete(f"/api/rcas/{rca_id}", headers=auth_headers)
    assert response.status_code == 200

    from models import db

    assert db.session.get(Rca, rca_id) is None


def test_rca_requires_auth(client):
    """Test that RCA endpoints require authentication."""
    response = client.get("/api/rcas")
    assert response.status_code == 401

    response = client.post("/api/rcas", json={"name": "Unauthed"})
    assert response.status_code == 401


def test_rca_not_found(client, auth_headers, sample_user):
    """Test getting a non-existent RCA."""
    response = client.get("/api/rcas/99999", headers=auth_headers)
    assert response.status_code == 404


def test_rca_validation_error(client, auth_headers, sample_user):
    """Test creating an RCA with validation errors."""
    # Name too long
    response = client.post(
        "/api/rcas",
        json={"name": "x" * 201},
        headers=auth_headers,
    )
    assert response.status_code == 400
